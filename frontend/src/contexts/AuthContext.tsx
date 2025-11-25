import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { adminLogin, getCurrentAdmin, setAuthToken, AdminUser } from '../utils/api';
import { toast } from 'sonner';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: AdminUser | null;
  login: (username: string, password: string) => Promise<{ success: boolean; requires2fa?: boolean }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'admin_token';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [user, setUser] = useState<AdminUser | null>(null);

  // Check for existing token on mount
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      setAuthToken(token);
      verifyToken();
    } else {
      setIsLoading(false);
    }
  }, []);

  const verifyToken = async () => {
    try {
      const response = await getCurrentAdmin();
      setUser(response.data);
      setIsAuthenticated(true);
    } catch (error) {
      // Token is invalid, clear it
      localStorage.removeItem(TOKEN_KEY);
      setAuthToken(null);
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (username: string, password: string): Promise<{ success: boolean; requires2fa?: boolean }> => {
    try {
      const response = await adminLogin({ username, password });
      if (response.data.requires_2fa && response.data.temp_token) {
        // Store temp token for next step
        sessionStorage.setItem('admin_temp_token', response.data.temp_token);
        toast.message('Two-factor code required');
        return { success: false, requires2fa: true };
      }
      const { access_token } = response.data as any;
      if (!access_token) {
        throw new Error('Invalid login response');
      }
      localStorage.setItem(TOKEN_KEY, access_token);
      setAuthToken(access_token);
      // Try to fetch user info, but don't block login if it fails
      try {
        const userResponse = await getCurrentAdmin();
        setUser(userResponse.data);
      } catch (e) {
        // Non-fatal: keep token and proceed
      }
      setIsAuthenticated(true);
      toast.success('Login successful');
      return { success: true };
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || 'Login failed';
      toast.error(errorMessage);
      return { success: false };
    }
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setAuthToken(null);
    setIsAuthenticated(false);
    setUser(null);
    toast.success('Logged out successfully');
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        user,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

