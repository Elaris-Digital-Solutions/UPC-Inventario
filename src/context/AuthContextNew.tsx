/**
 * Updated AuthContext
 * Integrates with new StudentService and AuthService
 * 
 * Features:
 * - Student registration with carrera selection
 * - Magic link (passwordless) authentication
 * - Session token management
 * - User profile caching
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { studentService } from '@/services/StudentService';
import { authService } from '@/services/AuthService';
import type { Alumno, Carrera } from '@/types/Database';

interface AuthContextType {
  // Auth state
  isAuthenticated: boolean;
  authLoading: boolean;
  alumno: Alumno | null;
  sessionToken: string | null;

  // Methods
  isUniversityEmail: (email: string) => boolean;
  getCarreras: () => Promise<Carrera[]>;
  register: (email: string, nombre: string, apellido: string, carrera_id: string) => Promise<{ success: boolean; error?: string }>;
  requestMagicLink: (email: string) => Promise<{ success: boolean; token?: string; error?: string }>;
  verifyToken: (token: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const UPC_EMAIL_REGEX = /^[a-zA-Z0-9._-]+@upc\.edu\.pe$/i;
const SESSION_TOKEN_KEY = 'upc_session_token';
const SESSION_EXPIRY_KEY = 'upc_session_expiry';

const isValidUpcEmail = (email: string) => UPC_EMAIL_REGEX.test(email.trim().toLowerCase());

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [alumno, setAlumno] = useState<Alumno | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Initialize auth from localStorage on mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedToken = localStorage.getItem(SESSION_TOKEN_KEY);
        const storedExpiry = localStorage.getItem(SESSION_EXPIRY_KEY);

        if (storedToken && storedExpiry) {
          const expiryTime = parseInt(storedExpiry, 10);
          const now = Date.now();

          // Check if token is still valid (with 1-minute buffer)
          if (expiryTime > now + 60000) {
            // Try to verify token and fetch user data
            try {
              const studentId = await authService.verifySessionToken(storedToken);
              if (studentId) {
                setSessionToken(storedToken);

                // Fetch user profile
                const student = await studentService.getStudentById(studentId);
                if (student) {
                  setAlumno(student);
                }
              }
            } catch (error) {
              console.error('Token verification failed:', error);
              clearSession();
            }
          } else {
            // Token expired
            clearSession();
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        setAuthLoading(false);
      }
    };

    initializeAuth();
  }, []);

  /**
   * Clear session from state and localStorage
   */
  const clearSession = () => {
    setSessionToken(null);
    setAlumno(null);
    localStorage.removeItem(SESSION_TOKEN_KEY);
    localStorage.removeItem(SESSION_EXPIRY_KEY);
  };

  /**
   * Store session in state and localStorage
   */
  const storeSession = (token: string, student: Alumno) => {
    setSessionToken(token);
    setAlumno(student);

    // Session expires in 24 hours
    const expiryTime = Date.now() + 24 * 60 * 60 * 1000;
    localStorage.setItem(SESSION_TOKEN_KEY, token);
    localStorage.setItem(SESSION_EXPIRY_KEY, expiryTime.toString());
  };

  /**
   * Register a new student
   */
  const register = async (
    email: string,
    nombre: string,
    apellido: string,
    carrera_id: string
  ): Promise<{ success: boolean; error?: string }> => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!isValidUpcEmail(normalizedEmail)) {
      return { success: false, error: 'Only @upc.edu.pe email addresses are allowed' };
    }

    if (!nombre.trim()) {
      return { success: false, error: 'First name is required' };
    }

    if (!apellido.trim()) {
      return { success: false, error: 'Last name is required' };
    }

    if (!carrera_id) {
      return { success: false, error: 'Please select a major' };
    }

    try {
      await studentService.registerStudent({
        email: normalizedEmail,
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        carrera_id,
      });

      return {
        success: true,
      };
    } catch (error) {
      console.error('Registration error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An error occurred during registration',
      };
    }
  };

  /**
   * Request a magic link for login
   */
  const requestMagicLink = async (
    email: string
  ): Promise<{ success: boolean; token?: string; error?: string }> => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!isValidUpcEmail(normalizedEmail)) {
      return { success: false, error: 'Only @upc.edu.pe email addresses are allowed' };
    }

    try {
      const result = await authService.requestMagicLink(normalizedEmail);

      if (!result.success) {
        return {
          success: false,
          error: result.error,
        };
      }

      // For development/testing: return token
      // In production: send via email and do NOT return token
      return {
        success: true,
        token: result.token,  // Remove in production
      };
    } catch (error) {
      console.error('Magic link request error:', error);
      return {
        success: false,
        error: 'Failed to request magic link',
      };
    }
  };

  /**
   * Verify a magic link token and complete login
   */
  const verifyToken = async (token: string): Promise<{ success: boolean; error?: string }> => {
    if (!token.trim()) {
      return { success: false, error: 'Token is required' };
    }

    try {
      const result = await authService.verifyToken(token);

      if (!result.success) {
        return {
          success: false,
          error: result.error,
        };
      }

      // Store session and user data
      if (result.sessionToken && result.alumno) {
        storeSession(result.sessionToken, result.alumno);
      }

      return { success: true };
    } catch (error) {
      console.error('Token verification error:', error);
      return {
        success: false,
        error: 'Failed to verify token',
      };
    }
  };

  /**
   * Logout: clear session
   */
  const logout = async (): Promise<void> => {
    try {
      if (alumno) {
        await authService.logout(alumno.id);
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      clearSession();
    }
  };

  /**
   * Fetch all active carreras
   */
  const getCarreras = async (): Promise<Carrera[]> => {
    try {
      return await studentService.getCarreras();
    } catch (error) {
      console.error('Error fetching carreras:', error);
      return [];
    }
  };

  return (
    <AuthContext.Provider value={{
      isAuthenticated: !!sessionToken && !!alumno,
      authLoading,
      alumno,
      sessionToken,
      isUniversityEmail: isValidUpcEmail,
      getCarreras,
      register,
      requestMagicLink,
      verifyToken,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Hook to use auth context
 * Throws error if used outside of AuthProvider
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

/**
 * Hook to get auth token for API requests
 * Returns 'Bearer {token}' or null if not authenticated
 */
export const useAuthToken = () => {
  const { sessionToken } = useAuth();
  return sessionToken ? `Bearer ${sessionToken}` : null;
};
