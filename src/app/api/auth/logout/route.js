import { NextRequest, NextResponse } from 'next/server';
import { authService } from '../../../../lib/auth-service';

export async function POST(request) {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'No token provided' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Logout user (deactivate session)
    const success = await authService.logoutUser(token);

    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Logout failed' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Logout successful'
    });

  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}