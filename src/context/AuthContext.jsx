'use client';

import { createContext, useContext, useReducer, useEffect } from 'react';

// Initial auth state
const initialAuthState = {
  isAuthenticated: false,
  user: null,
  token: null,
  isLoading: true,
  error: null,
  sessionId: null
};

// Auth action types
export const AUTH_ACTIONS = {
  LOGIN_START: 'LOGIN_START',
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILURE: 'LOGIN_FAILURE',
  LOGOUT: 'LOGOUT',
  REGISTER_START: 'REGISTER_START',
  REGISTER_SUCCESS: 'REGISTER_SUCCESS',
  REGISTER_FAILURE: 'REGISTER_FAILURE',
  SET_LOADING: 'SET_LOADING',
  CLEAR_ERROR: 'CLEAR_ERROR',
  RESTORE_SESSION: 'RESTORE_SESSION',
  UPDATE_USER: 'UPDATE_USER'
};

// Auth reducer
function authReducer(state, action) {
  switch (action.type) {
    case AUTH_ACTIONS.LOGIN_START:
    case AUTH_ACTIONS.REGISTER_START:
      return {
        ...state,
        isLoading: true,
        error: null
      };

    case AUTH_ACTIONS.LOGIN_SUCCESS:
    case AUTH_ACTIONS.REGISTER_SUCCESS:
      return {
        ...state,
        isAuthenticated: true,
        user: action.payload.user,
        token: action.payload.token,
        isLoading: false,
        error: null
      };

    case AUTH_ACTIONS.LOGIN_FAILURE:
    case AUTH_ACTIONS.REGISTER_FAILURE:
      return {
        ...state,
        isAuthenticated: false,
        user: null,
        token: null,
        isLoading: false,
        error: action.payload.error
      };

    case AUTH_ACTIONS.LOGOUT:
      return {
        ...initialAuthState,
        isLoading: false
      };

    case AUTH_ACTIONS.SET_LOADING:
      return {
        ...state,
        isLoading: action.payload
      };

    case AUTH_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null
      };

    case AUTH_ACTIONS.RESTORE_SESSION:
      return {
        ...state,
        isAuthenticated: !!action.payload.token,
        user: action.payload.user,
        token: action.payload.token,
        sessionId: action.payload.sessionId,
        isLoading: false
      };

    case AUTH_ACTIONS.UPDATE_USER:
      return {
        ...state,
        user: { ...state.user, ...action.payload }
      };

    default:
      return state;
  }
}

// Create auth context
const AuthContext = createContext();

/**
 * Auth provider component
 */
export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialAuthState);

  // Restore session on mount
  useEffect(() => {
    restoreSession();
  }, []);

  /**
   * Restore user session from localStorage
   */
  const restoreSession = () => {
    try {
      const token = localStorage.getItem('auth-token');
      const userData = localStorage.getItem('user-data');
      const sessionId = localStorage.getItem('session-id') || `session_${Date.now()}`;

      if (token && userData) {
        const user = JSON.parse(userData);
        
        dispatch({
          type: AUTH_ACTIONS.RESTORE_SESSION,
          payload: { token, user, sessionId }
        });

        // Verify token is still valid
        verifyToken(token);
      } else {
        // Generate session ID for guest users
        localStorage.setItem('session-id', sessionId);
        dispatch({
          type: AUTH_ACTIONS.RESTORE_SESSION,
          payload: { token: null, user: null, sessionId }
        });
      }
    } catch (error) {
      console.error('Error restoring session:', error);
      dispatch({
        type: AUTH_ACTIONS.RESTORE_SESSION,
        payload: { token: null, user: null, sessionId: `session_${Date.now()}` }
      });
    }
  };

  /**
   * Verify token validity
   */
  const verifyToken = async (token) => {
    try {
      const response = await fetch('/api/auth/verify', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        // Token is invalid, logout user
        logout();
      }
    } catch (error) {
      console.error('Token verification failed:', error);
      // Continue without logout on network errors
    }
  };

  /**
   * Login user
   */
  const login = async (email, password) => {
    dispatch({ type: AUTH_ACTIONS.LOGIN_START });

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: email,
          password: password
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Store in localStorage
        localStorage.setItem('auth-token', data.token);
        localStorage.setItem('user-data', JSON.stringify(data.user));

        dispatch({
          type: AUTH_ACTIONS.LOGIN_SUCCESS,
          payload: {
            user: data.user,
            token: data.token
          }
        });

        return { success: true, user: data.user };
      } else {
        dispatch({
          type: AUTH_ACTIONS.LOGIN_FAILURE,
          payload: { error: data.error || 'Login failed' }
        });

        return { success: false, error: data.error || 'Login failed' };
      }
    } catch (error) {
      const errorMessage = 'Network error. Please try again.';
      
      dispatch({
        type: AUTH_ACTIONS.LOGIN_FAILURE,
        payload: { error: errorMessage }
      });

      return { success: false, error: errorMessage };
    }
  };

  /**
   * Register user
   */
  const register = async (kycData) => {
    dispatch({ type: AUTH_ACTIONS.REGISTER_START });

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ kycData }),
      });

      const data = await response.json();

      if (data.success) {
        // Store in localStorage
        localStorage.setItem('auth-token', data.token);
        localStorage.setItem('user-data', JSON.stringify(data.user));

        dispatch({
          type: AUTH_ACTIONS.REGISTER_SUCCESS,
          payload: {
            user: data.user,
            token: data.token
          }
        });

        return { success: true, user: data.user };
      } else {
        dispatch({
          type: AUTH_ACTIONS.REGISTER_FAILURE,
          payload: { error: data.error || 'Registration failed' }
        });

        return { success: false, error: data.error || 'Registration failed' };
      }
    } catch (error) {
      const errorMessage = 'Network error. Please try again.';
      
      dispatch({
        type: AUTH_ACTIONS.REGISTER_FAILURE,
        payload: { error: errorMessage }
      });

      return { success: false, error: errorMessage };
    }
  };

  /**
   * Logout user
   */
  const logout = async () => {
    try {
      const token = localStorage.getItem('auth-token');
      
      if (token) {
        // Call logout API
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
      }
    } catch (error) {
      console.error('Logout API call failed:', error);
    } finally {
      // Clear localStorage
      localStorage.removeItem('auth-token');
      localStorage.removeItem('user-data');
      
      // Generate new session ID for guest mode
      const newSessionId = `session_${Date.now()}`;
      localStorage.setItem('session-id', newSessionId);

      dispatch({ type: AUTH_ACTIONS.LOGOUT });
    }
  };

  /**
   * Clear authentication error
   */
  const clearError = () => {
    dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });
  };

  /**
   * Update user data
   */
  const updateUser = (userData) => {
    const updatedUser = { ...state.user, ...userData };
    
    // Update localStorage
    localStorage.setItem('user-data', JSON.stringify(updatedUser));
    
    dispatch({
      type: AUTH_ACTIONS.UPDATE_USER,
      payload: userData
    });
  };

  /**
   * Get current session ID
   */
  const getSessionId = () => {
    return state.sessionId || localStorage.getItem('session-id') || `session_${Date.now()}`;
  };

  /**
   * Check if user has specific role
   */
  const hasRole = (role) => {
    return state.user?.role === role || state.user?.role === 'admin';
  };

  /**
   * Get authorization headers for API calls
   */
  const getAuthHeaders = () => {
    const headers = {
      'Content-Type': 'application/json',
    };

    if (state.token) {
      headers['Authorization'] = `Bearer ${state.token}`;
    }

    return headers;
  };

  const contextValue = {
    // State
    ...state,
    
    // Actions
    login,
    register,
    logout,
    clearError,
    updateUser,
    
    // Utilities
    getSessionId,
    hasRole,
    getAuthHeaders,
    verifyToken: () => verifyToken(state.token)
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Custom hook to use auth context
 */
export function useAuthContext() {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  
  return context;
}

export default AuthContext;