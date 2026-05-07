import { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);

function decodeToken(token) {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch {
    return {};
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('token'));

  const parsed        = token ? decodeToken(token) : {};
  const role          = parsed.role || parsed.roles || null;
  const username      = parsed.username || parsed.sub || null;
  const userId        = parsed.id || parsed.user_id || null;
  const location_id   = parsed.location_id || null;
  const location_slug = parsed.location_slug || null;

  // ← store slug in localStorage so it persists across navigation
  const [savedSlug, setSavedSlug] = useState(
    () => localStorage.getItem('location_slug')
  );

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
      username,
      userId,
      location_id,
      location_slug: location_slug || savedSlug,  // ← JWT first, fallback to stored
      saveToken,
      saveLocationSlug,                            // ← expose this
      clearToken,
      isAuthenticated: !!token,
      isGlobalAdmin: role === 'global_admin',
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}