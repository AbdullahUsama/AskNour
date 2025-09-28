'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Image from 'next/image';

// Dynamically import components to avoid SSR issues
const ChatInterface = dynamic(() => import('./../src/components/ChatInterface'), {
  ssr: false
});

const ClientWrapper = dynamic(() => import('./../src/components/ClientWrapper'), {
  ssr: false
});

/**
 * Main chat page component
 * This is the entry point for the Arabic chatbot application
 */
export default function HomePage() {
  const [isClient, setIsClient] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setIsClient(true);
  }, []);

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
    <ClientWrapper>
      {({ user, isAuthenticated, logout, connectionStatus, messageStats }) => (
        <MainPageContent 
          user={user}
          isAuthenticated={isAuthenticated}
          logout={logout}
          connectionStatus={connectionStatus}
          messageStats={messageStats}
          router={router}
        />
      )}
    </ClientWrapper>
  );
}

/**
 * Main page content component
 */
function MainPageContent({ user, isAuthenticated, logout, connectionStatus, messageStats, router }) {
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

  return (
    <main className="min-h-screen bg-blue-50 relative">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-200/50 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <Image 
                src="/fue-red-logo.jpg" 
                alt="FUE Logo" 
                width={40}
                height={40}
                className="mr-3"
              />
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  Future University Egypt
                </h1>
                <p className="text-sm text-gray-600">
                  Admission Assistant - مساعد القبول
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Connection Status */}
              <div className="hidden sm:flex items-center text-sm text-gray-600">
                <div className={`w-3 h-3 rounded-full mr-2 ${
                  connectionStatus === 'connected' ? 'bg-green-400 animate-pulse' :
                  connectionStatus === 'connecting' ? 'bg-yellow-400 animate-pulse' :
                  'bg-red-400'
                }`}></div>
                <span className="capitalize">{connectionStatus || 'disconnected'}</span>
              </div>

              {/* Message Count (if chat is active) */}
              {isClient && messageStats && messageStats.total > 0 && (
                <div className="hidden md:flex items-center text-sm text-gray-600">
                  <span className="mr-1">💬</span>
                  <span>{messageStats.total} messages</span>
                </div>
              )}

              {/* Authentication Section */}
              {isAuthenticated ? (
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-medium">
                        {user?.name?.charAt(0).toUpperCase() || 'U'}
                      </span>
                    </div>
                    <span className="hidden sm:inline text-sm font-medium text-gray-900">
                      {user?.name || 'User'}
                    </span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="text-sm text-gray-600 hover:text-red-600 transition-colors"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <div className="flex items-center space-x-3">
                  <button
                    onClick={handleLogin}
                    className="text-sm text-blue-600 hover:text-blue-800 transition-colors font-medium"
                  >
                    Login
                  </button>
                  <button
                    onClick={handleRegister}
                    className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Register
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Welcome Message for New Users */}
      {isClient && !isAuthenticated && messageStats && messageStats.total === 0 && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pt-20">
          <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-lg border border-white/20 p-6 mb-6">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 text-xl">🎓</span>
                </div>
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">
                  Welcome to Future University Egypt!
                </h2>
                <p className="text-gray-600 mb-4">
                  I&apos;m your AI admission assistant. I can help you with:
                </p>
                <ul className="text-sm text-gray-600 space-y-1 mb-4">
                  <li>• University programs and requirements</li>
                  <li>• Admission procedures and deadlines</li>
                  <li>• Campus facilities and student life</li>
                  <li>• Scholarships and financial aid</li>
                  <li>• General inquiries in Arabic or English</li>
                </ul>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={handleRegister}
                    className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Create Account for Full Features
                  </button>
                  <button
                    onClick={() => {/* Scroll to chat or focus input */}}
                    className="px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-md hover:bg-gray-50 transition-colors"
                  >
                    Start Chatting
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Chat Interface */}
      <div className="pt-20 pb-20 min-h-screen">
        <ChatInterface />
      </div>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-200/50 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row justify-between items-center">
            <div className="text-sm text-gray-600 mb-4 sm:mb-0">
              © 2025 Future University Egypt. All rights reserved.
            </div>
            <div className="flex space-x-6 text-sm text-gray-600">
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
    </main>
  );
}