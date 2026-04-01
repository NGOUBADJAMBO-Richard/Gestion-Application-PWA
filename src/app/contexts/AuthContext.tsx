import React, { createContext, useContext, useState } from "react";

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
    const saved = localStorage.getItem("mgn-user");
    if (!saved) {
      return null;
    }

    try {
      return JSON.parse(saved) as User;
    } catch {
      localStorage.removeItem("mgn-user");
      return null;
    }
  });

  const login = async (email: string, password: string) => {
    // Mock login - in real app, this would call an API
    await new Promise((resolve) => setTimeout(resolve, 500));

    const now = new Date().toISOString();
    const mockUser: User = {
      id: "1",
      name: email.split("@")[0],
      email,
      role: "admin",
      phone: "+33 6 00 00 00 00",
      company: "M.G.N Manager",
      department: "Direction",
      joinedAt: "2026-01-01",
      lastLoginAt: now,
    };

    setUser(mockUser);
    localStorage.setItem("mgn-user", JSON.stringify(mockUser));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("mgn-user");
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
