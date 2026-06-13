import { NextRequest } from 'next/server';
import { runOrchestrator, StartupAnalysis } from '@/lib/agents/orchestrator';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, groqKey, geminiKey, geminiModel } = body;

    if (!prompt) {
      return new Response(JSON.stringify({ error: 'Prompt is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        // Callback to send logs as JSON lines
        const logCallback = (agentName: string, status: 'info' | 'success' | 'warning' | 'error', message: string) => {
          const chunk = JSON.stringify({
            type: 'log',
            agentName,
            status,
            message,
          }) + '\n';
          controller.enqueue(encoder.encode(chunk));
        };

        try {
          const result = await runOrchestrator(
            prompt,
            { 
              groqKey: groqKey || process.env.GROQ_API_KEY || undefined, 
              geminiKey: geminiKey || process.env.GEMINI_API_KEY || undefined,
              geminiModel: geminiModel || undefined
            },
            logCallback
          );

          // Stream final result
          const finalChunk = JSON.stringify({
            type: 'result',
            data: result,
          }) + '\n';
          controller.enqueue(encoder.encode(finalChunk));
          controller.close();
        } catch (error: any) {
          const errChunk = JSON.stringify({
            type: 'error',
            message: error.message || 'Orchestration execution failed.',
          }) + '\n';
          controller.enqueue(encoder.encode(errChunk));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'application/x-ndjson',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
