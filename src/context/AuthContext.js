import React, { createContext, useContext, useEffect, useState } from 'react';

const AuthContext = createContext();

const API_BASE = 'http://localhost:4000/api';
const STORAGE_KEY = 'monity_auth_v1';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);  // {id, email}
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // betöltés localStorage-ből
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setUser(parsed.user || null);
        setToken(parsed.token || null);
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setLoading(false);
  }, []);

  const saveAuth = (data) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  };

  const login = async (email, password) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const body = await res.json();
    if (!res.ok) {
      throw new Error(body.error || 'Nem sikerült bejelentkezni.');
    }

    setUser(body.user);
    setToken(body.token);
    saveAuth(body);
  };

  const register = async (email, password) => {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const body = await res.json();
    if (!res.ok) {
      throw new Error(body.error || 'Nem sikerült regisztrálni.');
    }

    setUser(body.user);
    setToken(body.token);
    saveAuth(body);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <AuthContext.Provider
      value={{ user, token, loading, login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
