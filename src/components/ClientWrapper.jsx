'use client';

import { useAuth, useChat } from '../hooks';

/**
 * Client wrapper component that handles hooks safely
 */
export default function ClientWrapper({ children }) {
  try {
    const { user, isAuthenticated, logout } = useAuth();
    const { connectionStatus, getMessageStats } = useChat();
    
    const messageStats = getMessageStats();

    return children({
      user,
      isAuthenticated,
      logout,
      connectionStatus,
      messageStats
    });
  } catch (error) {
    console.error('Error in ClientWrapper:', error);
    return children({
      user: null,
      isAuthenticated: false,
      logout: async () => ({ success: false }),
      connectionStatus: 'disconnected',
      messageStats: { total: 0 }
    });
  }
}