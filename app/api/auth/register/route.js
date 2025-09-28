// Use Edge Runtime to reduce bundle size
export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { name, email, password } = await request.json();

    // Simple validation
    if (!name || !email || !password) {
      return NextResponse.json({
        success: false,
        error: 'Name, email and password are required'
      }, { status: 400 });
    }

    // For now, return a mock response
    // You can integrate with your user registration service here
    const mockUser = {
      id: Date.now().toString(),
      email: email,
      name: name
    };

    return NextResponse.json({
      success: true,
      user: mockUser,
      token: 'mock-jwt-token'
    });

  } catch (error) {
    console.error('Register Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Registration failed'
    }, { status: 500 });
  }
}