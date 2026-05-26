/**
 * Entorno DEV (lo que usa `ng serve`).
 * Aquí va directo al backend FastAPI local — sin pasar por el gateway.
 */
export const environment = {
  production: false,
  // Backend FastAPI local
  apiUrl: 'http://127.0.0.1:8999/api',
  // Gateway desactivado en dev (llamadas directas)
  useGateway: false,
  gatewayUrl: '/proxy-gateway/forward',
};
