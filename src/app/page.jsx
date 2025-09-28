'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ChatInterface from '../components/ChatInterface';
import { useAuth, useChat } from '../hooks';

/**
 * Main chat page component
 * This is the entry point for the Arabic chatbot application
 */
export default function HomePage() {
  const [isClient, setIsClient] = useState(false);
  const router = useRouter();
  
  // Use our custom hooks
  const { user, isAuthenticated, logout } = useAuth();
  const { connectionStatus, getMessageStats } = useChat();
  
  const messageStats = getMessageStats();

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleLogout = async () => {
    const result = await logout();
    if (result.success) {
      router.refresh(); // Refresh to update UI state
    }
  };

  const handleLogin = () => {
    router.push('/auth/login');
  };

  const handleRegister = () => {
    router.push('/auth/register');
  };

  if (!isClient) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-16 h-16 bg-blue-200 rounded-full mb-4"></div>
          <div className="h-4 bg-blue-200 rounded w-32 mb-2"></div>
          <div className="h-3 bg-blue-100 rounded w-24"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 bg-white shadow-sm border-b flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-2">
            <div className="flex items-center">
              <img 
                src="/fue-red-logo.jpg" 
                alt="FUE Logo" 
                className="h-6 w-auto mr-2"
              />
              <div>
                <h1 className="text-sm font-bold text-gray-900">
                  Future University Egypt
                </h1>
                <p className="text-xs text-gray-500">
                  Admission Assistant - مساعد القبول
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Connection Status */}
              <div className="hidden sm:flex items-center text-sm text-gray-600">
                <div className={`w-2 h-2 rounded-full mr-2 ${
                  connectionStatus === 'connected' ? 'bg-green-400 animate-pulse' :
                  connectionStatus === 'connecting' ? 'bg-yellow-400 animate-pulse' :
                  'bg-red-400'
                }`}></div>
                <span className="capitalize text-xs">{connectionStatus}</span>
              </div>

              {/* Message Count (if chat is active) */}
              {messageStats.total > 0 && (
                <div className="hidden md:flex items-center text-xs text-gray-600">
                  <span className="mr-1">💬</span>
                  <span>{messageStats.total} messages</span>
                </div>
              )}

              {/* Authentication Section */}
              {isAuthenticated ? (
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-medium">
                        {user?.name?.charAt(0).toUpperCase() || 'U'}
                      </span>
                    </div>
                    <span className="hidden sm:inline text-xs font-medium text-gray-900">
                      {user?.name || 'User'}
                    </span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="text-xs text-gray-600 hover:text-red-600 transition-colors"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <div className="flex items-center space-x-3">
                  <button
                    onClick={handleLogin}
                    className="text-xs text-blue-600 hover:text-blue-800 transition-colors font-medium"
                  >
                    Login
                  </button>
                  <button
                    onClick={handleRegister}
                    className="px-2 py-1 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Register
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Chat Interface - Full Screen */}
      <main className="flex-1 overflow-hidden">
        <ChatInterface />
      </main>

      {/* Sticky Footer */}
      <footer className="sticky bottom-0 z-50 bg-gray-50 border-t flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
          <div className="flex flex-col sm:flex-row justify-between items-center">
            <div className="text-xs text-gray-500 mb-1 sm:mb-0">
              © 2025 Future University Egypt. All rights reserved.
            </div>
            <div className="flex space-x-4 text-xs text-gray-500">
              <a href="https://fue.edu.eg" target="_blank" rel="noopener noreferrer" 
                 className="hover:text-blue-600 transition-colors">
                Visit Website
              </a>
              <a href={process.env.NEXT_PUBLIC_REGISTER_BUTTON_URL || '#'} 
                 target="_blank" rel="noopener noreferrer"
                 className="hover:text-blue-600 transition-colors">
                Apply Online
              </a>
              {isAuthenticated && (
                <span className="text-green-600">
                  ✓ Registered User
                </span>
              )}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}