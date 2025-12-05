"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
} from "react";
import { useRouter } from "next/navigation";
import { api, User, Role } from "@/lib/api";

interface AuthContextType {
  user: User | null;
  isAuthLoading: boolean;
  login: (email: string, password: string) => Promise<User>;
  signup: (email: string, password: string, orgName: string, slug?: string) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  isOwner: boolean;
  isAdmin: boolean;
  canManageMembers: boolean;
  canManageSettings: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const router = useRouter();

  // Verify auth by calling /me endpoint
  // Cookie is sent automatically with credentials: 'include'
  const verifyAuth = useCallback(async () => {
    try {
      const userData = await api.getMe();
      setUser(userData as User);
    } catch {
      // Not authenticated or token expired
      setUser(null);
    } finally {
      setIsAuthLoading(false);
    }
  }, []);

  useEffect(() => {
    verifyAuth();
  }, [verifyAuth]);

  const refreshUser = useCallback(async () => {
    try {
      const userData = await api.getMe();
      setUser(userData as User);
    } catch {
      // Ignore errors
    }
  }, []);

  const login = async (email: string, password: string): Promise<User> => {
    const response = await api.login(email, password);
    // Cookie is set by the server, we just store user info in state
    setUser(response.user);
    setIsAuthLoading(false);
    return response.user;
  };

  const signup = async (email: string, password: string, orgName: string, slug?: string): Promise<User> => {
    const response = await api.signup(email, password, orgName, slug);
    // Cookie is set by the server, we just store user info in state
    setUser(response.user);
    setIsAuthLoading(false);
    return response.user;
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

  // Role-based permission helpers
  const isOwner = user?.role === "owner";
  const isAdmin = user?.role === "owner" || user?.role === "admin";
  const canManageMembers = isAdmin;
  const canManageSettings = isAdmin;

  return (
    <AuthContext.Provider value={{
      user,
      isAuthLoading,
      login,
      signup,
      logout,
      refreshUser,
      isOwner,
      isAdmin,
      canManageMembers,
      canManageSettings,
    }}>
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
