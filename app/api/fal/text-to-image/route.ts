import { fal } from "@fal-ai/client";
import { NextRequest, NextResponse } from "next/server";

fal.config({
  credentials: process.env.FAL_KEY,
});

// Route timeout - much shorter now since we're just submitting to queue
export const maxDuration = 10; // 10 seconds

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json();

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    if (prompt.length > 1000) {
      return NextResponse.json(
        { error: 'Prompt must be 1000 characters or less' },
        { status: 400 }
      );
    }

    // Submit to queue and return request_id immediately
    const { request_id } = await fal.queue.submit("fal-ai/reve/text-to-image", {
      input: {
        prompt,
        aspect_ratio: "1:1",
      },
    });

    return NextResponse.json({ request_id });
  } catch (error) {
    console.error('Text-to-image error:', error);
    return NextResponse.json(
      { error: 'Failed to submit generation request' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const requestId = searchParams.get('request_id');

    if (!requestId) {
      return NextResponse.json(
        { error: 'request_id is required' },
        { status: 400 }
      );
    }

    // Check queue status
    const status = await fal.queue.status("fal-ai/reve/text-to-image", {
      requestId,
      logs: true,
    });

    // If completed, also fetch the result
    if (status.status === 'COMPLETED') {
      try {
        const result = await fal.queue.result("fal-ai/reve/text-to-image", {
          requestId,
        });
        return NextResponse.json({
          ...status,
          data: result.data,
        });
      } catch (resultError) {
        // If result isn't ready yet, return status without data
        console.warn('Result not ready yet:', resultError);
        return NextResponse.json(status);
      }
    }

    return NextResponse.json(status);
  } catch (error) {
    console.error('Text-to-image status error:', error);
    return NextResponse.json(
      { error: 'Failed to check generation status' },
      { status: 500 }
    );
  }
}

