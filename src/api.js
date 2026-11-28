import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useState } from 'react';

// The infloop API is a separate service. Its URL is set at build time.
export const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
const TOKEN_KEY = 'infloop-token';

export class ApiError extends Error {
  constructor(message, status, fields, code) {
    super(message);
    this.status = status;
    this.fields = fields || {};
    this.code = code;
  }
}

export async function apiRequest(path, { method = 'GET', body, token } = {}) {
  if (!API_URL) throw new ApiError('The infloop API is not connected to this site yet.', 0);
  let response;
  try {
    response = await fetch(API_URL + path, {
      method,
      headers: { ...(body && { 'Content-Type': 'application/json' }), ...(token && { Authorization: `Bearer ${token}` }) },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('We could not reach the infloop API. Check your connection and try again.', 0);
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(data.error || 'Something went wrong. Try again.', response.status, data.fields, data.code);
  return data;
}

const readToken = () => { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } };
const storeToken = token => {
  try { if (token) localStorage.setItem(TOKEN_KEY, token); else localStorage.removeItem(TOKEN_KEY); } catch { /* The session then lasts until the tab closes. */ }
};

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(readToken);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(() => Boolean(readToken()));

  const logout = useCallback(() => { storeToken(null); setToken(null); setUser(null); }, []);

  useEffect(() => {
    if (!token || user) { setLoading(false); return undefined; }
    let current = true;
    setLoading(true);
    apiRequest('/auth/me', { token })
      .then(data => { if (current) setUser(data.user); })
      .catch(error => { if (current && error.status === 401) logout(); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [token, user, logout]);

  const login = useCallback(async credentials => {
    const data = await apiRequest('/auth/login', { method: 'POST', body: credentials });
    storeToken(data.token);
    setUser(data.user);
    setToken(data.token);
    return data.user;
  }, []);

  const value = useMemo(() => ({ token, user, loading, login, logout }), [token, user, loading, login, logout]);
  return createElement(AuthContext.Provider, { value }, children);
}
