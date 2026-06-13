import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const hasKeys = !!(process.env.GROQ_API_KEY || process.env.GEMINI_API_KEY);
  return NextResponse.json({ hasBackendKeys: hasKeys });
}
