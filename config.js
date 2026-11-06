/*
 * Read-only dashboard API endpoint.
 *
 * The dashboard falls back to the static data/dashboard.json snapshot if this
 * URL is empty or unreachable. The GitHub Pages workflow can override this
 * value with the KW_API_URL repository variable during the build.
 */
window.KW_DASHBOARD_API = "https://kw-api.zezo77.workers.dev";
