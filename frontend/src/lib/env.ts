/**
 * Project Pulse uses TWO separate URLs by design:
 *
 *   1. API_URL — internal API + Socket.io calls made by the browser.
 *      DEVELOPMENT: http://localhost:3001
 *      PRODUCTION:  the deployed backend (set VITE_API_URL at build time)
 *
 *   2. BACKEND_URL — public-facing webhook URLs shown to USERS in the UI.
 *      External services (GitHub, Jira, Slack, Teams) call this URL.
 *      DEVELOPMENT: an ngrok tunnel pointing at localhost:3001
 *      PRODUCTION:  the same public host as API_URL
 *
 * Always import from this module instead of reading `import.meta.env`
 * directly — that way the two concerns can't be accidentally crossed.
 */

// Internal API base. Used by every fetch() and Socket.io connection in the app.
export const API_URL: string =
  import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

// Public-facing host used when constructing webhook URLs we display to users.
// TODO: Replace with production URL when deploying.
// DEVELOPMENT ONLY: this is typically an ngrok tunnel URL.
export function getWebhookBaseUrl(): string {
  if (import.meta.env.VITE_BACKEND_URL) {
    return import.meta.env.VITE_BACKEND_URL as string;
  }
  // Fallback if VITE_BACKEND_URL isn't set: best-effort guess from the
  // current page. This is only useful for local dev with the backend on
  // the same host; production must set VITE_BACKEND_URL.
  return `${window.location.protocol}//${window.location.hostname}:3001`;
}

// Standard headers for all backend API calls. Skips the ngrok interstitial
// warning page when VITE_API_URL points at an ngrok tunnel.
export const API_HEADERS: HeadersInit = {
  'ngrok-skip-browser-warning': '1',
};
