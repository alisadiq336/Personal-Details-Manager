import React, { createContext, useContext, useMemo, useState } from 'react';

const AuthContext = createContext(null);
const TOKEN_KEY = 'pdm_token';
const USER_KEY = 'pdm_user';

export function AppProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  });

  const value = useMemo(() => ({
    token,
    user,
    login(auth) {
      localStorage.setItem(TOKEN_KEY, auth.token);
      localStorage.setItem(USER_KEY, JSON.stringify(auth.user));
      setToken(auth.token);
      setUser(auth.user);
    },
    logout() {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      setToken(null);
      setUser(null);
    }
  }), [token, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
