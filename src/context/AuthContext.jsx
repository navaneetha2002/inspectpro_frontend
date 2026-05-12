import { createContext, useEffect, useContext, useState } from 'react';

const AuthContext = createContext(null);

function decodeToken(token) {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch {
    return {};
  }
}

// Extract role from token
function decodeRole(token) {
  const decoded = decodeToken(token);
  return decoded?.role || null;
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [isScheduleAttendee, setIsScheduleAttendee] = useState(false);

  const parsed        = token ? decodeToken(token) : {};
  const role = parsed.role || null;
const userId = parsed.id || null;
  const username      = parsed.username || parsed.sub || null;
  const location_id   = parsed.location_id || null;
  const location_slug = parsed.location_slug || null;

  // ← store slug in localStorage so it persists across navigation
  const [savedSlug, setSavedSlug] = useState(
    () => localStorage.getItem('location_slug')
  );

 const [user, setUser] = useState(null);

 useEffect(() => {
  if (!token) {
    setUser(null);
    return;
  }

  const base = import.meta.env.VITE_API_BASE_URL;

  fetch(`${base}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` }
  })
    .then(res => res.json())
    .then(data => setUser(data))
    .catch(() => setUser(null));
}, [token]);

   useEffect(() => {
    if (!userId || !token) {
      setIsScheduleAttendee(false);
      return;
    }
    const base = import.meta.env.VITE_API_BASE_URL;
    fetch(`${base}/schedules/is-attendee`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : { is_attendee: false })
      .then(data => setIsScheduleAttendee(!!data?.is_attendee))
      .catch(() => setIsScheduleAttendee(false));
  }, [userId, token]);

  function saveToken(newToken) {
    localStorage.setItem('token', newToken);
    setToken(newToken);
  }

  function saveLocationSlug(slug) {
    localStorage.setItem('location_slug', slug);
    setSavedSlug(slug);
  }

  function clearToken() {
    localStorage.removeItem('token');
    localStorage.removeItem('location_slug');  // ← clear on logout
    setToken(null);
    setSavedSlug(null);
  }

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