import { NextRequest, NextResponse } from 'next/server';

const MODAL_SERVER_URL = process.env.MODAL_SERVER_URL || 'http://localhost:8000';

export async function POST(request: NextRequest) {
  try {
    const { code, timeout = 300 } = await request.json();
    
    if (!code) {
      return NextResponse.json({ error: 'No code provided' }, { status: 400 });
    }

    // Forward to Modal server
    const modalResponse = await fetch(`${MODAL_SERVER_URL}/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        timeout,
      }),
    });

    const modalResult = await modalResponse.json();

    if (!modalResponse.ok) {
      return NextResponse.json(
        { 
          error: 'Modal execution failed', 
          details: modalResult.error || 'Unknown error' 
        },
        { status: modalResponse.status }
      );
    }

    return NextResponse.json(modalResult);

  } catch (error) {
    console.error('Modal execution error:', error);
    return NextResponse.json(
      { 
        error: 'Execution failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
