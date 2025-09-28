// Use Edge Runtime to reduce bundle size
export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { email, password } = await request.json();

    // Simple validation
    if (!email || !password) {
      return NextResponse.json({
        success: false,
        error: 'Email and password are required'
      }, { status: 400 });
    }

    // For now, return a mock response
    // You can integrate with your authentication service here
    const mockUser = {
      id: '1',
      email: email,
      name: 'Test User'
    };

    return NextResponse.json({
      success: true,
      user: mockUser,
      token: 'mock-jwt-token'
    });

  } catch (error) {
    console.error('Login Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Login failed'
    }, { status: 500 });
  }
}