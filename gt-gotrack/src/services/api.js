/**
 * @file services/api.js
 * @description Base HTTP client for all gt-api calls.
 * Reads the stored access token from localStorage and attaches it automatically.
 * Fires a 'gt:auth:expired' event on 401 so AuthContext can clear the session.
 */

// In dev: requests go to /api/* which Vite proxies to gt-api (avoids CORS + localhost quirks)
// In prod: set VITE_API_URL to your deployed gt-api URL e.g. https://gt-api.fly.dev
const API_URL = import.meta.env.VITE_API_URL || '/api';
const AUTH_KEY = 'gt_auth';

/**
 * Reads the access token from localStorage without going through React state.
 * @returns {string|null}
 */
function getStoredToken() {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    const { access_token } = JSON.parse(raw);
    return access_token || null;
  } catch {
    return null;
  }
}

/**
 * Authenticated fetch wrapper for gt-api endpoints.
 * Automatically attaches Bearer token and JSON content-type.
 *
 * @param {string} path         - API path e.g. '/transactions'
 * @param {Object} [options]    - Fetch options (method, body, headers)
 * @param {string} [options.method]
 * @param {Object} [options.body]     - Will be JSON.stringify'd automatically
 * @param {Object} [options.headers]  - Merged on top of defaults
 * @returns {Promise<any>} Parsed JSON response
 * @throws {Error} On non-2xx responses or network failures
 */
export async function apiFetch(path, options = {}) {
  const token = getStoredToken();

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (res.status === 401) {
    const err = await res.json().catch(() => ({ error: 'Unauthorized' }));
    // Only fire session-expired if the user had an active session (i.e. not a login attempt)
    const hasSession = !!localStorage.getItem('gt_auth');
    if (hasSession) {
      window.dispatchEvent(new Event('gt:auth:expired'));
      throw new Error('Session expired. Please sign in again.');
    }
    throw new Error(err.error || 'Invalid credentials');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }

  // 204 No Content — return null
  if (res.status === 204) return null;
  return res.json();
}
