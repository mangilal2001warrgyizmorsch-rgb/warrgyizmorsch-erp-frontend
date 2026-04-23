"use client";

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { api } from "@/lib/api";

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  department?: string;
  isActive: boolean;
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, department?: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMe = useCallback(async (t: string) => {
    try {
      localStorage.setItem("hrm_token", t);
      const u = await api.get<User>("/auth/me");
      setUser(u);
      setToken(t);
    } catch {
      localStorage.removeItem("hrm_token");
      setUser(null);
      setToken(null);
    }
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("hrm_token");
    if (saved) fetchMe(saved).finally(() => setIsLoading(false));
    else setIsLoading(false);
  }, [fetchMe]);

  const login = async (email: string, password: string) => {
    const result = await api.post<{ token: string; user: User }>("/auth/login", { email, password });
    localStorage.setItem("hrm_token", result.token);
    setUser(result.user);
    setToken(result.token);
  };

  const register = async (name: string, email: string, password: string, department?: string) => {
    const result = await api.post<{ token: string; user: User }>("/auth/register", { name, email, password, department });
    localStorage.setItem("hrm_token", result.token);
    setUser(result.user);
    setToken(result.token);
  };

  const logout = () => {
    localStorage.removeItem("hrm_token");
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
