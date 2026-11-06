/*
 * Optional live-data endpoint.
 *
 * Leave this empty to use the static data/dashboard.json snapshot.
 * After deploying the Cloudflare Worker, set this to its URL, for example:
 *
 *   window.KW_DASHBOARD_API = "https://kw-api.your-subdomain.workers.dev";
 *
 * The GitHub Pages workflow can also inject this value from the
 * KW_API_URL repository variable during the build.
 */
window.KW_DASHBOARD_API = "";
