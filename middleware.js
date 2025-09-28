import { NextResponse } from 'next/server';

/**
 * Next.js Middleware for authentication
 * This runs before each request and handles JWT token validation
 * Uses only Edge Runtime compatible code (no Node.js modules)
 */

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // Skip middleware for public paths
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // Skip middleware for API auth endpoints
  if (pathname.startsWith('/api/auth/')) {
    return NextResponse.next();
  }

  // For now, we'll skip token verification in middleware and handle it in API routes
  // This is because Edge Runtime doesn't support Node.js crypto modules
  
  // Get token for header forwarding (basic check only)
  const token = getTokenFromRequest(request);

  // Add token to request headers for API routes to handle verification
  if (pathname.startsWith('/api/')) {
    const requestHeaders = new Headers(request.headers);
    if (token) {
      requestHeaders.set('x-auth-token', token);
    }

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  return NextResponse.next();
}

/**
 * Check if path is public (doesn't require authentication)
 */
function isPublicPath(pathname) {
  const publicPaths = [
    '/',
    '/auth/login',
    '/auth/register',
    '/api/chat', // Chat endpoint should be public for initial KYC
    '/api/speech-to-text',
    '/_next',
    '/favicon.ico',
    '/public'
  ];

  return publicPaths.some(path => pathname.startsWith(path));
}

/**
 * Extract JWT token from request
 */
function getTokenFromRequest(request) {
  // Check Authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Check cookies
  const token = request.cookies.get('auth-token')?.value;
  if (token) {
    return token;
  }

  return null;
}

/**
 * Return unauthorized response
 */
function unauthorizedResponse(request) {
  const { pathname } = request.nextUrl;

  // For API routes, return JSON error
  if (pathname.startsWith('/api/')) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // For pages, redirect to login
  const loginUrl = new URL('/auth/login', request.url);
  loginUrl.searchParams.set('returnUrl', pathname);
  return NextResponse.redirect(loginUrl);
}

/**
 * Middleware configuration
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};