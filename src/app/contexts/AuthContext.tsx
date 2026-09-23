import React, { createContext, useContext, useState } from "react";

import { storageKey } from "../../branding";

interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "team";
  phone: string;
  company: string;
  department: string;
  joinedAt: string;
  lastLoginAt: string;
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem(storageKey("user"));
    if (!saved) {
      return null;
    }

    try {
      return JSON.parse(saved) as User;
    } catch {
      localStorage.removeItem(storageKey("user"));
      return null;
    }
  });

  const login = async (email: string, _password: string) => {
    // Mock login - in real app, this would call an API
    await new Promise((resolve) => setTimeout(resolve, 500));

    const now = new Date().toISOString();
    const mockUser: User = {
      id: "1",
      name: email.split("@")[0] ?? email,
      email,
      role: "admin",
      phone: "+33 6 00 00 00 00",
      company: "M.G.N CodeWave",
      department: "Direction",
      joinedAt: "2026-01-01",
      lastLoginAt: now,
    };

    setUser(mockUser);
    localStorage.setItem(storageKey("user"), JSON.stringify(mockUser));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(storageKey("user"));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
