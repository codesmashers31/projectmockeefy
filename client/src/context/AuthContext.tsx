import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from '../lib/axios';


export interface User {
  id?: string;
  _id?: string;
  userId?: string;
  email: string;
  userType: string;
  name?: string;
  profileImage?: string;
  originalProfileImage?: string;
  phone?: string;
  personalInfo?: {
    phone?: string;
    city?: string;
    state?: string;
    country?: string;
    bio?: string;
  };
  role?: string;
  isPremium?: boolean;
  freeInterviewsCount?: number;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<User>;
  register: (email: string, password: string, userType: string, name: string, googleId?: string) => Promise<void>;
  googleLogin: (token: string) => Promise<any>;
  logout: () => void;
  isLoading: boolean;
  fetchProfile: () => Promise<User | null>;
  updateUser: (partialUser: Partial<User>) => void;
  setAuthSession: (accessToken: string, userData: any) => User;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

interface Props { children: ReactNode; }

export const AuthProvider: React.FC<Props> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        setToken(storedToken);
        try {
          await fetchProfile();
        } catch (error) {
          console.error("Session expired or invalid token");
          logout();
        }
      } else {
        setIsLoading(false);
      }
    };
    initAuth();
  }, []);

  const fetchProfile = async (): Promise<User | null> => {
    try {
      let response = await axios.get('/api/auth/profile');
      let userData: User = response.data.user;

      let expertData: any = {};
      if (userData.userType === 'expert') {
        try {
          const expertRes = await axios.get('/api/expert/profile');
          if (expertRes.data?.success) {
            expertData = expertRes.data.profile || {};
          }
        } catch (e) {
          console.warn('Failed to fetch expert extra details', e);
        }
      }

      const normalizedUser: User = {
        ...userData,
        id: userData.userId || (userData as any)._id || userData.id,
        phone: userData.personalInfo?.phone || (userData as any).phone || userData.phone,
        profileImage: expertData.photoUrl || userData.profileImage || (userData as any).photoUrl,
        originalProfileImage: expertData.originalPhotoUrl || userData.originalProfileImage || (userData as any).originalPhotoUrl || "",
        role: userData.userType || (userData as any).role,
        isPremium: userData.isPremium || (userData as any).isPremium || false,
        freeInterviewsCount: userData.freeInterviewsCount ?? (userData as any).freeInterviewsCount ?? 0,
      };

      setUser(normalizedUser);
      return normalizedUser;
    } catch (error: any) {
      console.error('Failed to fetch profile', error);
      const status = error.response?.status;
      if (status === 401 || status === 403) {
        // Axios interceptor will handle the refresh and redirect if it fails.
        // We just need to make sure state is consistent.
        setUser(null);
      }
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const updateUser = (partialUser: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        ...partialUser,
        personalInfo: {
          ...prev.personalInfo,
          ...partialUser.personalInfo,
        },
      };
    });
  };

  const login = async (email: string, password: string): Promise<User> => {
    try {
      const response = await axios.post('/api/auth/login', { email, password });
      const { accessToken, user: userData } = response.data;

      if (!accessToken || !userData) throw new Error('Invalid response from server');

      localStorage.setItem('token', accessToken);
      setToken(accessToken);

      // Normalize userId to id for consistency; keep profileImage so navbar/sidebar show it
      const normalizedUser: User = {
        ...userData,
        id: userData.userId || userData.id,
        phone: (userData as any).personalInfo?.phone || (userData as any).phone || userData.phone,
        role: userData.userType || (userData as any).role,
        isPremium: userData.isPremium ?? false,
        freeInterviewsCount: userData.freeInterviewsCount ?? 0,
        profileImage: (userData as any).profileImage ?? userData.profileImage,
      };

      setUser(normalizedUser);
      return normalizedUser;
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.message || 'Login failed';
      throw new Error(msg);
    }
  };

  const googleLogin = async (googleToken: string): Promise<any> => {
    try {
      // Using /google-signup endpoint which handles both login (if exists) and verification (if new)
      const response = await axios.post('/api/auth/google-signup', { token: googleToken });
      const { exists, accessToken, user: userData, googleData } = response.data;

      if (exists && accessToken && userData) {
        localStorage.setItem('token', accessToken);
        setToken(accessToken);

        const normalizedUser: User = {
          ...userData,
          id: userData.userId || userData.id,
          phone: (userData as any).personalInfo?.phone || (userData as any).phone || userData.phone,
          role: userData.userType || (userData as any).role,
          isPremium: userData.isPremium ?? false,
          freeInterviewsCount: userData.freeInterviewsCount ?? 0,
          profileImage: (userData as any).profileImage ?? userData.profileImage,
        };

        setUser(normalizedUser);
        return {
          success: true,
          exists: true,
          user: normalizedUser,
          googleData: googleData || {
            email: userData.email,
            name: userData.name,
            googleId: userData.googleId,
          },
        };
      } else {
        return { success: false, exists: false, googleData };
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Google Auth failed');
    }
  };

  const register = async (email: string, password: string, userType: string, name: string, googleId?: string) => {
    try {
      const res = await axios.post('/api/auth/register', { email, password, userType, name, googleId });

      const { accessToken, user: userData } = res.data;

      if (accessToken && userData) {
        localStorage.setItem('token', accessToken);
        setToken(accessToken);

        const normalizedUser: User = {
          ...userData,
          id: userData.userId || userData.id,
          phone: (userData as any).personalInfo?.phone || (userData as any).phone || userData.phone,
          role: userData.userType || (userData as any).role,
          isPremium: userData.isPremium ?? false,
          freeInterviewsCount: userData.freeInterviewsCount ?? 0,
          profileImage: (userData as any).profileImage ?? userData.profileImage,
        };

        setUser(normalizedUser);
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Registration failed');
    }
  };

  const setAuthSession = (accessToken: string, userData: any): User => {
    localStorage.setItem('token', accessToken);
    setToken(accessToken);

    const normalizedUser: User = {
      ...userData,
      id: userData.userId || userData._id || userData.id,
      phone: userData.personalInfo?.phone || (userData as any).phone || userData.phone,
      role: userData.userType || (userData as any).role,
      isPremium: userData.isPremium ?? false,
      freeInterviewsCount: userData.freeInterviewsCount ?? 0,
      profileImage: (userData as any).profileImage ?? userData.profileImage,
    };

    setUser(normalizedUser);
    return normalizedUser;
  };

  const logout = () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setToken(null);
    setUser(null);
    setIsLoading(false);
  };

  const value: AuthContextType = { user, token, login, googleLogin, register, logout, isLoading, fetchProfile, updateUser, setAuthSession };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
