/**
 * Next.js instrumentation — the global server error hook. Every unhandled
 * request error flows through the monitoring capture layer (Sentry when
 * configured, server console otherwise). Content-safe by construction: only
 * the error class, a bounded message and the route path are captured.
 */

export async function onRequestError(
  error: unknown,
  request: { path: string },
): Promise<void> {
  const { captureServerError } = await import('@/lib/monitoring/capture');
  await captureServerError(error, { route: request.path, kind: 'unhandled' });
}
