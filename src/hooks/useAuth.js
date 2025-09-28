import { useState, useCallback } from 'react';
import { useAuthContext } from '../context/AuthContext';

/**
 * Custom hook for authentication operations
 */
export function useAuth() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const authContext = useAuthContext();
  
  /**
   * Login with validation and error handling
   */
  const login = useCallback(async (credentials) => {
    setLoading(true);
    setError(null);
    
    try {
      // Validate credentials
      if (!credentials.email || !credentials.password) {
        throw new Error('Email and password are required');
      }
      
      if (!/\S+@\S+\.\S+/.test(credentials.email)) {
        throw new Error('Please enter a valid email address');
      }
      
      if (credentials.password.length < 6) {
        throw new Error('Password must be at least 6 characters long');
      }
      
      const result = await authContext.login(credentials);
      
      if (!result.success) {
        throw new Error(result.error || 'Login failed');
      }
      
      return result;
      
    } catch (err) {
      const errorMessage = err.message || 'An unexpected error occurred during login';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [authContext]);
  
  /**
   * Register with validation and error handling
   */
  const register = useCallback(async (userData) => {
    setLoading(true);
    setError(null);
    
    try {
      // Validate user data
      const { name, email, password, confirmPassword } = userData;
      
      if (!name || !email || !password || !confirmPassword) {
        throw new Error('All fields are required');
      }
      
      if (name.length < 2) {
        throw new Error('Name must be at least 2 characters long');
      }
      
      if (!/\S+@\S+\.\S+/.test(email)) {
        throw new Error('Please enter a valid email address');
      }
      
      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters long');
      }
      
      if (password !== confirmPassword) {
        throw new Error('Passwords do not match');
      }
      
      // Check password strength
      if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
        throw new Error('Password must contain at least one uppercase letter, one lowercase letter, and one number');
      }
      
      const result = await authContext.register(userData);
      
      if (!result.success) {
        throw new Error(result.error || 'Registration failed');
      }
      
      return result;
      
    } catch (err) {
      const errorMessage = err.message || 'An unexpected error occurred during registration';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [authContext]);
  
  /**
   * Logout with cleanup
   */
  const logout = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      await authContext.logout();
      return { success: true };
    } catch (err) {
      const errorMessage = err.message || 'An error occurred during logout';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [authContext]);
  
  /**
   * Verify email
   */
  const verifyEmail = useCallback(async (token) => {
    setLoading(true);
    setError(null);
    
    try {
      if (!token) {
        throw new Error('Verification token is required');
      }
      
      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Email verification failed');
      }
      
      return { success: true, message: 'Email verified successfully' };
      
    } catch (err) {
      const errorMessage = err.message || 'Email verification failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);
  
  /**
   * Request password reset
   */
  const requestPasswordReset = useCallback(async (email) => {
    setLoading(true);
    setError(null);
    
    try {
      if (!email) {
        throw new Error('Email address is required');
      }
      
      if (!/\S+@\S+\.\S+/.test(email)) {
        throw new Error('Please enter a valid email address');
      }
      
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Password reset request failed');
      }
      
      return { success: true, message: 'Password reset email sent' };
      
    } catch (err) {
      const errorMessage = err.message || 'Password reset request failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);
  
  /**
   * Reset password
   */
  const resetPassword = useCallback(async (token, newPassword) => {
    setLoading(true);
    setError(null);
    
    try {
      if (!token || !newPassword) {
        throw new Error('Token and new password are required');
      }
      
      if (newPassword.length < 6) {
        throw new Error('Password must be at least 6 characters long');
      }
      
      if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
        throw new Error('Password must contain at least one uppercase letter, one lowercase letter, and one number');
      }
      
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, newPassword }),
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Password reset failed');
      }
      
      return { success: true, message: 'Password reset successfully' };
      
    } catch (err) {
      const errorMessage = err.message || 'Password reset failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);
  
  /**
   * Update user profile
   */
  const updateProfile = useCallback(async (updates) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: authContext.getAuthHeaders(),
        body: JSON.stringify(updates),
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Profile update failed');
      }
      
      // Update user in auth context
      if (data.user) {
        authContext.setUser(data.user);
      }
      
      return { success: true, user: data.user };
      
    } catch (err) {
      const errorMessage = err.message || 'Profile update failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [authContext]);
  
  /**
   * Change password
   */
  const changePassword = useCallback(async (currentPassword, newPassword) => {
    setLoading(true);
    setError(null);
    
    try {
      if (!currentPassword || !newPassword) {
        throw new Error('Current password and new password are required');
      }
      
      if (newPassword.length < 6) {
        throw new Error('New password must be at least 6 characters long');
      }
      
      if (currentPassword === newPassword) {
        throw new Error('New password must be different from current password');
      }
      
      const response = await fetch('/api/auth/change-password', {
        method: 'PUT',
        headers: authContext.getAuthHeaders(),
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Password change failed');
      }
      
      return { success: true, message: 'Password changed successfully' };
      
    } catch (err) {
      const errorMessage = err.message || 'Password change failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [authContext]);
  
  /**
   * Check if user has specific role
   */
  const hasRole = useCallback((role) => {
    return authContext.hasRole(role);
  }, [authContext]);
  
  /**
   * Check if user has any of the specified permissions
   */
  const hasPermission = useCallback((permissions) => {
    return authContext.hasPermission(permissions);
  }, [authContext]);
  
  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);
  
  return {
    // State from auth context
    user: authContext.user,
    isAuthenticated: authContext.isAuthenticated,
    isLoading: authContext.isLoading || loading,
    error: error || authContext.error,
    
    // Auth operations
    login,
    register,
    logout,
    verifyEmail,
    requestPasswordReset,
    resetPassword,
    updateProfile,
    changePassword,
    
    // Utilities
    hasRole,
    hasPermission,
    clearError,
    getAuthHeaders: authContext.getAuthHeaders,
    getSessionId: authContext.getSessionId,
  };
}

export default useAuth;