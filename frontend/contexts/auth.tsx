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
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    verifyAuth();
  }, []);

  // Verify auth by calling /me endpoint
  // Cookie is sent automatically with credentials: 'include'
  const verifyAuth = async () => {
    try {
      const userData = await api.getMe();
      setUser(userData);
    } catch {
      // Not authenticated or token expired
      setUser(null);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const response = await api.login(email, password);
    // Cookie is set by the server, we just store user info in state
    setUser(response.user);
    setIsAuthLoading(false);
  };

  const signup = async (email: string, password: string, orgName: string) => {
    const response = await api.signup(email, password, orgName);
    // Cookie is set by the server, we just store user info in state
    setUser(response.user);
    setIsAuthLoading(false);
  };

  const logout = async () => {
    try {
      // Call logout endpoint to clear the cookie on server
      await api.logout();
    } catch {
      // Ignore errors - we'll clear state anyway
    }
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
