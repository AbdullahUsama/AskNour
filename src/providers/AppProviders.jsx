'use client';

import { AuthProvider } from '../context/AuthContext';
import { ChatProvider } from '../context/ChatContext';

/**
 * Main app providers wrapper
 * Combines all context providers in the correct order
 */
export function AppProviders({ children }) {
  return (
    <AuthProvider>
      <ChatProvider>
        {children}
      </ChatProvider>
    </AuthProvider>
  );
}

export default AppProviders;