import { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);

function decodeToken(token) {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch {
    return null;
  }
}

// Extract role from token
function decodeRole(token) {
  const decoded = decodeToken(token);
  return decoded?.role || null;
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [role, setRole] = useState(() => {
    const t = localStorage.getItem('token');
    return t ? decodeRole(t) : null;
  });

  const user = token ? decodeToken(token) : null;

  function saveToken(newToken) {
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setRole(decodeRole(newToken));
  }

  function clearToken() {
    localStorage.removeItem('token');
    setToken(null);
    setRole(null);
  }

  return (
    <AuthContext.Provider value={{ token, user, role, saveToken, clearToken, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
