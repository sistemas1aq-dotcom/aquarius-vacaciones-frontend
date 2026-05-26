/**
 * Gateway interceptor — envuelve cualquier request a la API en un envelope
 * y la manda al proxy securityguard, que reenvia al backend real.
 *
 * Asi el navegador hace UNA SOLA llamada cross-origin (al gateway) y se
 * desentiende del CORS del backend.
 *
 * Activacion: environment.useGateway === true.
 *
 * Formato envelope que espera el WAR (ver proxy-gateway/README.md):
 *   POST /securityguard/forward
 *   {
 *     "url":     "http://...:port/path",
 *     "method":  "GET" | "POST" | ...,
 *     "headers": { ... },
 *     "query":   { ... },
 *     "body":    "<string crudo o JSON serializado>"
 *   }
 *
 * Respuesta:
 *   {
 *     "status":  200,
 *     "headers": { ... },
 *     "body":    "<string>"
 *   }
 *
 * Si env.status >= 400 lanzamos HttpErrorResponse para que los catchError
 * de los servicios y el authInterceptor (401) sigan funcionando igual.
 */
import {
  HttpInterceptorFn, HttpRequest, HttpResponse, HttpErrorResponse, HttpEvent, HttpHeaders
} from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';

export const gatewayInterceptor: HttpInterceptorFn = (req, next) => {
  // Si el flag no está activo o la URL no apunta al backend, dejar pasar.
  const env = environment as any;
  if (!env.useGateway || !env.gatewayUrl || !req.url.startsWith(env.apiUrl)) {
    return next(req);
  }

  // ─── Construir envelope ────────────────────────────────────────
  const headers: Record<string, string> = {};
  req.headers.keys().forEach(k => {
    const v = req.headers.get(k);
    if (v !== null) headers[k] = v;
  });
  // Forzamos JSON aunque el cliente no lo haya seteado, para POST/PUT con body objeto.
  if (req.body !== null && req.body !== undefined && !headers['Content-Type'] && !headers['content-type']) {
    headers['Content-Type'] = 'application/json';
  }

  const query: Record<string, string> = {};
  req.params.keys().forEach(k => {
    const v = req.params.get(k);
    if (v !== null) query[k] = v;
  });

  let body: string | undefined;
  if (req.body !== null && req.body !== undefined) {
    body = (typeof req.body === 'string') ? req.body : JSON.stringify(req.body);
  }

  const envelope = {
    url: req.url,
    method: req.method,
    headers,
    query,
    body,
  };

  // ─── Reemplazar la request por una nueva al gateway ───────────
  const gwReq = new HttpRequest(
    'POST',
    env.gatewayUrl,
    envelope,
    { headers: new HttpHeaders({ 'Content-Type': 'application/json' }) }
  );

  return next(gwReq).pipe(
    map((event: HttpEvent<any>) => {
      if (!(event instanceof HttpResponse)) return event;

      const wrapped = event.body as { status: number; headers?: Record<string,string>; body?: string };

      // Si por alguna razón no es un envelope válido, devolver tal cual.
      if (!wrapped || typeof wrapped.status !== 'number') return event;

      // Parsear el body que viene como string (puede ser JSON o texto).
      let parsedBody: any = wrapped.body ?? null;
      if (typeof parsedBody === 'string' && parsedBody.length) {
        try { parsedBody = JSON.parse(parsedBody); } catch { /* dejar como string */ }
      }

      if (wrapped.status >= 200 && wrapped.status < 300) {
        return new HttpResponse({
          body: parsedBody,
          status: wrapped.status,
          statusText: 'OK',
          url: req.url,
          headers: event.headers,
        });
      }

      // Error → tirar HttpErrorResponse para que catchError del authInterceptor lo agarre.
      throw new HttpErrorResponse({
        error: parsedBody,
        status: wrapped.status,
        statusText: 'Error',
        url: req.url,
      });
    })
  );
};
