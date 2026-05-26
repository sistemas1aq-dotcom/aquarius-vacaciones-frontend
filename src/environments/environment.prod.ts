/**
 * Entorno PROD (lo que se compila con `ng build`).
 *
 * Las llamadas a `apiUrl` son INTERCEPTADAS y reenviadas al gateway
 * (mismo origen que el front → adios CORS). El gateway en el server
 * llega al backend FastAPI por red interna.
 *
 *   apiUrl     = url que el GATEWAY usará para alcanzar al backend
 *   gatewayUrl = endpoint público del gateway (mismo origen que el frontend)
 */
export const environment = {
  production: true,

  // URL que el gateway debe usar para llegar al backend FastAPI.
  // El gateway corre en el mismo server, así que localhost le sirve.
  apiUrl: 'http://127.0.0.1:8999/api',

  // Gateway: mismo origen que el frontend → no hay CORS.
  // Si el frontend se sirve desde otro dominio que no sea el del gateway,
  // poner aquí la URL absoluta (ej. 'https://marcaciongps.aquariusconsultores.com:8443/securityguard/forward')
  useGateway: true,
  gatewayUrl: '/proxy-gateway/forward',
};
