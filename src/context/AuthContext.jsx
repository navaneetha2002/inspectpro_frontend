import { createContext, useEffect, useContext, useState, useCallback } from 'react';

const AuthContext = createContext(null);

function decodeToken(token) {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch {
    return {};
  }
}

function isTokenExpired(token) {
  if (!token) return true;
  try {
    const payload = decodeToken(token);
    return payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => {
    const stored = localStorage.getItem('token');
    // If token is expired on initial load, clear it immediately
    if (isTokenExpired(stored)) {
      localStorage.removeItem('token');
      localStorage.removeItem('location_slug');
      return null;
    }
    return stored;
  });

  const [isScheduleAttendee, setIsScheduleAttendee] = useState(false);
  const [user, setUser] = useState(null);
  const [savedSlug, setSavedSlug] = useState(
    () => localStorage.getItem('location_slug')
  );

  const parsed       = token ? decodeToken(token) : {};
  const role         = parsed.role || null;
  const userId       = parsed.id || null;
  const username     = parsed.username || parsed.sub || null;
  const location_id  = parsed.location_id || null;
  const location_slug = parsed.location_slug || null;

  // Central logout — clears everything
  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('location_slug');
    setToken(null);
    setSavedSlug(null);
    setUser(null);
    setIsScheduleAttendee(false);
  }, []);

  // Periodic expiry check: every 60s + on tab focus
  useEffect(() => {
    const check = () => {
      const stored = localStorage.getItem('token');
      if (isTokenExpired(stored)) {
        logout();
      }
    };

    const interval = setInterval(check, 60_000);
    window.addEventListener('focus', check);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', check);
    };
  }, [logout]);

  // Fetch /auth/me when token changes; logout on 401
  useEffect(() => {
    if (!token) {
      setUser(null);
      return;
    }

    const base = import.meta.env.VITE_API_BASE_URL;

    fetch(`${base}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => {
        if (res.status === 401) {
          logout();       // server says token is invalid/expired
          return null;
        }
        return res.json();
      })
      .then(data => { if (data) setUser(data); })
      .catch(() => setUser(null));
  }, [token, logout]);

  // Fetch attendee status; logout on 401
  useEffect(() => {
    if (!userId || !token) {
      setIsScheduleAttendee(false);
      return;
    }

    const base = import.meta.env.VITE_API_BASE_URL;

    fetch(`${base}/schedules/is-attendee`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => {
        if (r.status === 401) {
          logout();
          return null;
        }
        return r.ok ? r.json() : { is_attendee: false };
      })
      .then(data => {
        if (data) setIsScheduleAttendee(!!data?.is_attendee);
      })
      .catch(() => setIsScheduleAttendee(false));
  }, [userId, token, logout]);

  function saveToken(newToken) {
    localStorage.setItem('token', newToken);
    setToken(newToken);
  }

  function saveLocationSlug(slug) {
    localStorage.setItem('location_slug', slug);
    setSavedSlug(slug);
  }

  // Keep clearToken as an alias for logout (backward compat)
  const clearToken = logout;

  return (
    <AuthContext.Provider value={{
      token,
      role,
      user,
      username,
      userId,
      location_id,
      location_slug: location_slug || savedSlug,
      saveToken,
      saveLocationSlug,
      clearToken,
      logout,
      isAuthenticated: !!token,
      isGlobalAdmin: role === 'global_admin',
      isScheduleAttendee,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}