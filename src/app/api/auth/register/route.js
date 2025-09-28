import { NextRequest, NextResponse } from 'next/server';
import { authService } from '../../../../lib/auth-service';

export async function POST(request) {
  try {
    const body = await request.json();
    const { kycData } = body;

    if (!kycData) {
      return NextResponse.json(
        { success: false, error: 'KYC data is required' },
        { status: 400 }
      );
    }

    // Validate required fields
    const requiredFields = ['name', 'email', 'mobile', 'faculty', 'password'];
    const missingFields = requiredFields.filter(field => !kycData[field]);

    if (missingFields.length > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields',
          missingFields 
        },
        { status: 400 }
      );
    }

    // Register user
    const userId = await authService.registerUser(kycData);

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User already exists or registration failed' },
        { status: 409 }
      );
    }

    // Authenticate the newly registered user
    const [token, userData] = await authService.authenticateUser(
      kycData.email, 
      kycData.password
    );

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Registration successful but auto-login failed' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'User registered successfully',
      token,
      user: userData
    });

  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}