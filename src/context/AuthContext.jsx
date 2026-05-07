import { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);

function decodeRole(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.role || payload.roles || null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [role, setRole] = useState(() => {
    const t = localStorage.getItem('token');
    return t ? decodeRole(t) : null;
  });

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
    <AuthContext.Provider value={{ token, role, saveToken, clearToken, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
