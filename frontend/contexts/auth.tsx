"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { api, User } from "@/lib/api";

interface AuthContextType {
  user: User | null;
  isAuthLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, orgName: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    verifyAuth();
  }, []);

  const verifyAuth = async () => {
    const token = localStorage.getItem("token");

    // No token present - user is not logged in
    if (!token) {
      setUser(null);
      setIsAuthLoading(false);
      return;
    }

    // Token exists - verify it with the backend
    try {
      const userData = await api.getMe();
      setUser(userData);
      // Update stored user data in case it changed
      localStorage.setItem("user", JSON.stringify(userData));
    } catch (err) {
      // Token is invalid or expired - clear auth state
      console.error("Auth verification failed:", err);
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      setUser(null);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const response = await api.login(email, password);
    localStorage.setItem("token", response.token);
    localStorage.setItem("user", JSON.stringify(response.user));
    setUser(response.user);
    setIsAuthLoading(false);
  };

  const signup = async (email: string, password: string, orgName: string) => {
    const response = await api.signup(email, password, orgName);
    localStorage.setItem("token", response.token);
    localStorage.setItem("user", JSON.stringify(response.user));
    setUser(response.user);
    setIsAuthLoading(false);
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    setIsAuthLoading(false);
    router.push("/login");
  };

  return (
    <AuthContext.Provider value={{ user, isAuthLoading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
