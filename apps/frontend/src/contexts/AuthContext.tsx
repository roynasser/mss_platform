'use client';

import React, { createContext, useContext, useReducer, useEffect, ReactNode, useCallback } from 'react';
import { User, AuthResponse, LoginCredentials, RegisterData, ApiResponse, MFASetupResponse } from '../types/index';
import { authService } from '../services/authService';

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  requiresMFA: boolean;
  mfaToken: string | null;
}

type AuthAction =
  | { type: 'AUTH_START' }
  | { type: 'AUTH_SUCCESS'; payload: { user: User; token: string; refreshToken?: string } }
  | { type: 'AUTH_MFA_REQUIRED'; payload: { mfaToken: string } }
  | { type: 'AUTH_FAILURE'; payload: string }
  | { type: 'AUTH_LOGOUT' }
  | { type: 'CLEAR_ERROR' }
  | { type: 'UPDATE_USER'; payload: User }
  | { type: 'TOKEN_REFRESHED'; payload: { token: string; refreshToken?: string; user: User } };

interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  clearError: () => void;
  updateUser: (user: User) => void;
  refreshAuthToken: () => Promise<boolean>;
  setupMFA: () => Promise<MFASetupResponse | null>;
  verifyMFASetup: (token: string, secret: string) => Promise<string[] | null>;
  verifyMFA: (token: string) => Promise<void>;
  disableMFA: (currentPassword: string) => Promise<void>;
  generateBackupCodes: () => Promise<string[] | null>;
}

const initialState: AuthState = {
  user: null,
  token: null,
  refreshToken: null,
  isLoading: false,
  error: null,
  isAuthenticated: false,
  requiresMFA: false,
  mfaToken: null,
};

const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'AUTH_START':
      return { ...state, isLoading: true, error: null };
    
    case 'AUTH_SUCCESS':
      return {
        ...state,
        isLoading: false,
        user: action.payload.user,
        token: action.payload.token,
        refreshToken: action.payload.refreshToken || state.refreshToken,
        isAuthenticated: true,
        requiresMFA: false,
        mfaToken: null,
        error: null,
      };
    
    case 'AUTH_MFA_REQUIRED':
      return {
        ...state,
        isLoading: false,
        requiresMFA: true,
        mfaToken: action.payload.mfaToken,
        isAuthenticated: false,
        error: null,
      };
    
    case 'AUTH_FAILURE':
      return {
        ...state,
        isLoading: false,
        error: action.payload,
        user: null,
        token: null,
        refreshToken: null,
        isAuthenticated: false,
        requiresMFA: false,
        mfaToken: null,
      };
    
    case 'TOKEN_REFRESHED':
      return {
        ...state,
        token: action.payload.token,
        refreshToken: action.payload.refreshToken || state.refreshToken,
        user: action.payload.user,
        isAuthenticated: true,
      };
    
    case 'AUTH_LOGOUT':
      return {
        ...initialState,
      };
    
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    
    case 'UPDATE_USER':
      return { ...state, user: action.payload };
    
    default:
      return state;
  }
};

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Token refresh logic
  const refreshAuthToken = useCallback(async (): Promise<boolean> => {
    try {
      const response = await authService.refreshToken();
      
      if (response.success && response.data && response.data.user) {
        // Update activity time on successful token refresh
        localStorage.setItem('mss_last_activity', Date.now().toString());
        dispatch({
          type: 'TOKEN_REFRESHED',
          payload: {
            token: response.data.token || '',
            refreshToken: response.data.refreshToken || '',
            user: response.data.user,
          },
        });
        return true;
      }
      
      // Refresh failed, logout
      authService.clearStoredAuth();
      dispatch({ type: 'AUTH_LOGOUT' });
      return false;
    } catch (error) {
      console.error('Token refresh error:', error);
      authService.clearStoredAuth();
      dispatch({ type: 'AUTH_LOGOUT' });
      return false;
    }
  }, []);

  // Initialize auth state from localStorage on app start
  useEffect(() => {
    const initAuth = async () => {
      dispatch({ type: 'AUTH_START' });
      
      try {
        const token = localStorage.getItem('mss_token');
        const refreshToken = localStorage.getItem('mss_refresh_token');
        const userData = localStorage.getItem('mss_user');
        const lastActivity = localStorage.getItem('mss_last_activity');
        
        if (token && userData) {
          const user: User = JSON.parse(userData);
          
          // Check if session has expired based on last activity (5 minutes = 300000ms)
          const SESSION_TIMEOUT = 5 * 60 * 1000; // 5 minutes
          const now = Date.now();
          const lastActivityTime = lastActivity ? parseInt(lastActivity) : now;
          const hasSessionExpired = (now - lastActivityTime) > SESSION_TIMEOUT;
          
          if (hasSessionExpired) {
            console.log('Session expired due to inactivity');
            authService.clearStoredAuth();
            dispatch({ type: 'AUTH_LOGOUT' });
            return;
          }
          
          // Update last activity time
          localStorage.setItem('mss_last_activity', now.toString());
          
          // Only verify token if it might be expired (older than 45 minutes)
          // JWT tokens typically have 1 hour expiry, so we check after 45 minutes
          const TOKEN_CHECK_THRESHOLD = 45 * 60 * 1000; // 45 minutes
          const shouldVerifyToken = (now - lastActivityTime) > TOKEN_CHECK_THRESHOLD;
          
          if (shouldVerifyToken) {
            try {
              const isValid = await authService.verifyToken(token);
              
              if (isValid) {
                dispatch({
                  type: 'AUTH_SUCCESS',
                  payload: { user, token, refreshToken: refreshToken || undefined }
                });
              } else if (refreshToken) {
                // Try to refresh the token
                const refreshSuccess = await refreshAuthToken();
                if (!refreshSuccess) {
                  authService.clearStoredAuth();
                  dispatch({ type: 'AUTH_LOGOUT' });
                }
              } else {
                // No valid token or refresh token, logout
                authService.clearStoredAuth();
                dispatch({ type: 'AUTH_LOGOUT' });
              }
            } catch (error) {
              console.error('Token verification failed, but continuing with cached session:', error);
              // Don't logout on network errors - continue with cached session
              dispatch({
                type: 'AUTH_SUCCESS',
                payload: { user, token, refreshToken: refreshToken || undefined }
              });
            }
          } else {
            // Session is recent, trust the cached token
            dispatch({
              type: 'AUTH_SUCCESS',
              payload: { user, token, refreshToken: refreshToken || undefined }
            });
          }
        } else {
          dispatch({ type: 'AUTH_LOGOUT' });
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        // Don't logout on initialization errors - might be network issues
        const token = localStorage.getItem('mss_token');
        const userData = localStorage.getItem('mss_user');
        if (token && userData) {
          const user: User = JSON.parse(userData);
          dispatch({
            type: 'AUTH_SUCCESS',
            payload: { user, token, refreshToken: localStorage.getItem('mss_refresh_token') || undefined }
          });
        } else {
          dispatch({ type: 'AUTH_LOGOUT' });
        }
      }
    };

    initAuth();
  }, [refreshAuthToken]);

  const login = async (credentials: LoginCredentials) => {
    dispatch({ type: 'AUTH_START' });
    
    // Development mode fallback for testing
    if (process.env.NODE_ENV === 'development' && credentials.email === 'test@example.com') {
      const devUser: User = {
        id: '1',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'customer',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        requiresMFA: false
      };
      
      const devToken = 'dev-token-' + Date.now();
      
      localStorage.setItem('mss_token', devToken);
      localStorage.setItem('mss_user', JSON.stringify(devUser));
      localStorage.setItem('mss_last_activity', Date.now().toString());
      
      dispatch({
        type: 'AUTH_SUCCESS',
        payload: { user: devUser, token: devToken, refreshToken: undefined }
      });
      return;
    }
    
    try {
      const response = await authService.login(credentials);
      
      // Debug logging
      if (process.env.NODE_ENV === 'development') {
        console.log('AuthContext received response:', response);
      }
      
      if (response.success) {
        // The API response is wrapped by makeRequest, so we need to access response.data
        const apiResponse = response.data;
        
        // Debug logging
        if (process.env.NODE_ENV === 'development') {
          console.log('Processing API response:', apiResponse);
        }
        
        // Check if response is MFA required
        if (apiResponse && apiResponse.requiresMFA) {
          dispatch({
            type: 'AUTH_MFA_REQUIRED',
            payload: { mfaToken: apiResponse.mfaToken || apiResponse.pendingSessionId || '' }
          });
          return;
        }
        
        // Handle various possible response formats
        let user: User | null = null;
        let accessToken: string | null = null;
        let refreshToken: string | null = null;
        
        // Debug: Log all available properties
        if (process.env.NODE_ENV === 'development') {
          console.log('=== AUTH RESPONSE DEBUG ===');
          console.log('Full response:', JSON.stringify(response, null, 2));
          console.log('apiResponse keys:', apiResponse ? Object.keys(apiResponse) : 'null');
          console.log('apiResponse.data keys:', apiResponse?.data ? Object.keys(apiResponse.data) : 'null');
          console.log('Has apiResponse.user?', !!apiResponse?.user);
          console.log('Has apiResponse.token?', !!apiResponse?.token);
          console.log('Has apiResponse.data?', !!apiResponse?.data);
          console.log('Has apiResponse.data.user?', !!apiResponse?.data?.user);
          console.log('Has apiResponse.data.tokens?', !!apiResponse?.data?.tokens);
        }
        
        // Format 1: Nested structure { data: { user, tokens: { accessToken, refreshToken } } }
        if (apiResponse && apiResponse.data && apiResponse.data.user && apiResponse.data.tokens) {
          user = apiResponse.data.user;
          accessToken = apiResponse.data.tokens.accessToken;
          refreshToken = apiResponse.data.tokens.refreshToken;
          if (process.env.NODE_ENV === 'development') {
            console.log('Using Format 1: Nested structure');
          }
        }
        // Format 2: Direct structure { user, token, refreshToken }
        else if (apiResponse && apiResponse.user && apiResponse.token) {
          user = apiResponse.user;
          accessToken = apiResponse.token;
          refreshToken = apiResponse.refreshToken;
          if (process.env.NODE_ENV === 'development') {
            console.log('Using Format 2: Direct structure');
          }
        }
        // Format 3: Flat structure { user, tokens: { accessToken, refreshToken } }
        else if (apiResponse && apiResponse.user && apiResponse.tokens) {
          user = apiResponse.user;
          accessToken = apiResponse.tokens.accessToken || apiResponse.tokens.token;
          refreshToken = apiResponse.tokens.refreshToken;
          if (process.env.NODE_ENV === 'development') {
            console.log('Using Format 3: Flat structure with tokens object');
          }
        }
        // Format 4: Common REST API format { success: true, data: { user, token } }
        else if (apiResponse && apiResponse.data && apiResponse.data.user && apiResponse.data.token) {
          user = apiResponse.data.user;
          accessToken = apiResponse.data.token;
          refreshToken = apiResponse.data.refreshToken;
          if (process.env.NODE_ENV === 'development') {
            console.log('Using Format 4: REST API format');
          }
        }
        // Format 5: Simple flat format { user, accessToken, refreshToken }
        else if (apiResponse && apiResponse.user && apiResponse.accessToken) {
          user = apiResponse.user;
          accessToken = apiResponse.accessToken;
          refreshToken = apiResponse.refreshToken;
          if (process.env.NODE_ENV === 'development') {
            console.log('Using Format 5: Simple flat format');
          }
        }
        // Format 6: Try to extract from any nested data structure
        else if (apiResponse) {
          // Try to find user and token anywhere in the response
          const findUser = (obj: any): User | null => {
            if (obj && typeof obj === 'object') {
              if (obj.user && obj.user.id) return obj.user;
              if (obj.id && obj.email) return obj as User;
              for (const key in obj) {
                const result = findUser(obj[key]);
                if (result) return result;
              }
            }
            return null;
          };
          
          const findToken = (obj: any): string | null => {
            if (obj && typeof obj === 'object') {
              if (obj.token && typeof obj.token === 'string') return obj.token;
              if (obj.accessToken && typeof obj.accessToken === 'string') return obj.accessToken;
              if (obj.access_token && typeof obj.access_token === 'string') return obj.access_token;
              for (const key in obj) {
                const result = findToken(obj[key]);
                if (result) return result;
              }
            }
            return null;
          };
          
          user = findUser(apiResponse);
          accessToken = findToken(apiResponse);
          
          if (process.env.NODE_ENV === 'development' && (user || accessToken)) {
            console.log('Using Format 6: Deep search found:', { user: !!user, token: !!accessToken });
          }
        }
        
        if (user && accessToken) {
          // Store in localStorage
          localStorage.setItem('mss_token', accessToken);
          if (refreshToken) {
            localStorage.setItem('mss_refresh_token', refreshToken);
          }
          localStorage.setItem('mss_user', JSON.stringify(user));
          localStorage.setItem('mss_last_activity', Date.now().toString());
          
          dispatch({
            type: 'AUTH_SUCCESS',
            payload: { user, token: accessToken, refreshToken: refreshToken || undefined }
          });
        } else {
          console.error('Invalid login response format - could not find user and token');
          console.error('Response structure:', JSON.stringify(apiResponse, null, 2));
          
          // In development mode, create a fallback user based on the email
          if (process.env.NODE_ENV === 'development') {
            console.warn('Creating development fallback user...');
            const role = credentials.email.includes('admin') ? 'admin' : 
                        credentials.email.includes('tech') ? 'technician' : 'customer';
            
            const fallbackUser: User = {
              id: 'dev-' + Date.now(),
              email: credentials.email,
              firstName: 'Development',
              lastName: 'User',
              role: role,
              isActive: true,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              requiresMFA: false
            };
            
            const fallbackToken = 'dev-fallback-' + Date.now();
            
            localStorage.setItem('mss_token', fallbackToken);
            localStorage.setItem('mss_user', JSON.stringify(fallbackUser));
            localStorage.setItem('mss_last_activity', Date.now().toString());
            
            dispatch({
              type: 'AUTH_SUCCESS',
              payload: { user: fallbackUser, token: fallbackToken, refreshToken: undefined }
            });
            
            console.warn('Created development user:', fallbackUser);
            return;
          }
          
          dispatch({
            type: 'AUTH_FAILURE',
            payload: 'Invalid login response format - missing user or token information'
          });
        }
      } else {
        dispatch({
          type: 'AUTH_FAILURE',
          payload: response.error || 'Login failed'
        });
      }
    } catch (error) {
      dispatch({
        type: 'AUTH_FAILURE',
        payload: error instanceof Error ? error.message : 'Login failed'
      });
    }
  };

  const register = async (data: RegisterData) => {
    dispatch({ type: 'AUTH_START' });
    
    try {
      const response: ApiResponse<AuthResponse> = await authService.register(data);
      
      if (response.success && response.data && response.data.user && response.data.token) {
        const { user, token, refreshToken } = response.data;
        
        // Store in localStorage
        localStorage.setItem('mss_token', token);
        if (refreshToken) {
          localStorage.setItem('mss_refresh_token', refreshToken);
        }
        localStorage.setItem('mss_user', JSON.stringify(user));
        localStorage.setItem('mss_last_activity', Date.now().toString());
        
        dispatch({
          type: 'AUTH_SUCCESS',
          payload: { user, token, refreshToken }
        });
      } else {
        dispatch({
          type: 'AUTH_FAILURE',
          payload: response.error || 'Registration failed'
        });
      }
    } catch (error) {
      dispatch({
        type: 'AUTH_FAILURE',
        payload: error instanceof Error ? error.message : 'Registration failed'
      });
    }
  };

  const logout = () => {
    // Call logout API
    authService.logout();
    
    // Clear localStorage
    authService.clearStoredAuth();
    
    // Clear auth state
    dispatch({ type: 'AUTH_LOGOUT' });
  };

  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  const updateUser = (user: User) => {
    // Update localStorage
    localStorage.setItem('mss_user', JSON.stringify(user));
    localStorage.setItem('mss_last_activity', Date.now().toString());
    
    // In development mode, also set a fake token if switching users
    if (process.env.NODE_ENV === 'development' && !state.token) {
      const fakeToken = 'dev-token-' + user.id;
      localStorage.setItem('mss_token', fakeToken);
      dispatch({
        type: 'AUTH_SUCCESS',
        payload: { user, token: fakeToken, refreshToken: undefined }
      });
    } else {
      // Update state normally
      dispatch({ type: 'UPDATE_USER', payload: user });
    }
  };

  // MFA Functions
  const setupMFA = async (): Promise<MFASetupResponse | null> => {
    try {
      const response = await authService.setupMFA();
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.error || 'Failed to setup MFA');
    } catch (error) {
      console.error('MFA setup error:', error);
      return null;
    }
  };

  const verifyMFASetup = async (token: string, secret: string): Promise<string[] | null> => {
    try {
      const response = await authService.verifyMFASetup(token, secret);
      if (response.success && response.data) {
        // Refresh user data to reflect MFA enabled status
        const userResponse = await authService.getCurrentUser();
        if (userResponse.success && userResponse.data) {
          updateUser(userResponse.data);
        }
        return response.data.backupCodes;
      }
      throw new Error(response.error || 'Failed to verify MFA setup');
    } catch (error) {
      console.error('MFA verification error:', error);
      return null;
    }
  };

  const verifyMFA = async (token: string): Promise<void> => {
    dispatch({ type: 'AUTH_START' });
    
    try {
      const response = await authService.verifyMFA(token, state.mfaToken || undefined);
      
      if (response.success && response.data && response.data.data && response.data.data.user && response.data.data.tokens) {
        const { user, tokens } = response.data.data;
        
        // Store in localStorage
        localStorage.setItem('mss_token', tokens.accessToken);
        if (tokens.refreshToken) {
          localStorage.setItem('mss_refresh_token', tokens.refreshToken);
        }
        localStorage.setItem('mss_user', JSON.stringify(user));
        localStorage.setItem('mss_last_activity', Date.now().toString());
        
        dispatch({
          type: 'AUTH_SUCCESS',
          payload: { user, token: tokens.accessToken, refreshToken: tokens.refreshToken }
        });
      } else {
        dispatch({
          type: 'AUTH_FAILURE',
          payload: response.error || 'MFA verification failed'
        });
      }
    } catch (error) {
      dispatch({
        type: 'AUTH_FAILURE',
        payload: error instanceof Error ? error.message : 'MFA verification failed'
      });
    }
  };

  const disableMFA = async (currentPassword: string): Promise<void> => {
    try {
      const response = await authService.disableMFA(currentPassword);
      if (response.success) {
        // Refresh user data to reflect MFA disabled status
        const userResponse = await authService.getCurrentUser();
        if (userResponse.success && userResponse.data) {
          updateUser(userResponse.data);
        }
      } else {
        throw new Error(response.error || 'Failed to disable MFA');
      }
    } catch (error) {
      console.error('MFA disable error:', error);
      throw error;
    }
  };

  const generateBackupCodes = async (): Promise<string[] | null> => {
    try {
      const response = await authService.generateBackupCodes();
      if (response.success && response.data) {
        return response.data.backupCodes;
      }
      throw new Error(response.error || 'Failed to generate backup codes');
    } catch (error) {
      console.error('Backup codes generation error:', error);
      return null;
    }
  };

  const contextValue: AuthContextType = {
    ...state,
    login,
    register,
    logout,
    clearError,
    updateUser,
    refreshAuthToken,
    setupMFA,
    verifyMFASetup,
    verifyMFA,
    disableMFA,
    generateBackupCodes,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};