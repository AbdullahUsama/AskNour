// Use Edge Runtime to reduce bundle size
export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request) {
  try {
    // For now, return a mock transcription
    // You can integrate with external speech-to-text services here
    return NextResponse.json({
      success: true,
      transcription: "This is a mock transcription. Speech-to-text functionality will be implemented with external APIs."
    });

  } catch (error) {
    console.error('Speech-to-text Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Speech-to-text processing failed'
    }, { status: 500 });
  }
}