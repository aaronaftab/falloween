import { fal } from "@fal-ai/client";
import { NextRequest, NextResponse } from "next/server";
import { config } from "@/lib/config";

fal.config({
  credentials: config.fal.apiKey,
});

// Route timeout - much shorter now since we're just submitting to queue
export const maxDuration = 10; // 10 seconds

export async function POST(request: NextRequest) {
  try {
    const { prompt, image_urls } = await request.json();

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

    if (!image_urls || !Array.isArray(image_urls)) {
      return NextResponse.json(
        { error: 'image_urls must be an array' },
        { status: 400 }
      );
    }

    if (image_urls.length === 0 || image_urls.length > 10) {
      return NextResponse.json(
        { error: 'Provide between 1 and 10 image URLs' },
        { status: 400 }
      );
    }

    // Validate all URLs are strings
    if (!image_urls.every(url => typeof url === 'string' && url.trim())) {
      return NextResponse.json(
        { error: 'All image URLs must be valid strings' },
        { status: 400 }
      );
    }

    // Submit to queue and return request_id immediately
    const { request_id } = await fal.queue.submit("fal-ai/reve/remix", {
      input: {
        prompt,
        image_urls,
      },
    });

    return NextResponse.json({ 
      request_id,
      submittedAt: Date.now() 
    });
  } catch (error) {
    console.error('Remix error:', error);
    return NextResponse.json(
      { error: 'Failed to submit costume generation request' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const requestId = searchParams.get('request_id');
    const submittedAt = searchParams.get('submitted_at');

    if (!requestId) {
      return NextResponse.json(
        { error: 'request_id is required' },
        { status: 400 }
      );
    }

    // Check queue status
    const status = await fal.queue.status("fal-ai/reve/remix", {
      requestId,
      logs: true,
    });

    // Calculate generation time if completed
    let generationTime = null;
    if (status.status === 'COMPLETED' && submittedAt) {
      const submittedTimestamp = parseInt(submittedAt, 10);
      if (!isNaN(submittedTimestamp)) {
        generationTime = Date.now() - submittedTimestamp;
      }
    }

    // If completed, also fetch the result
    if (status.status === 'COMPLETED') {
      try {
        const result = await fal.queue.result("fal-ai/reve/remix", {
          requestId,
        });
        return NextResponse.json({
          ...status,
          data: result.data,
          generationTime,
        });
      } catch (resultError) {
        // If result isn't ready yet, return status without data
        console.warn('Result not ready yet:', resultError);
        return NextResponse.json({
          ...status,
          generationTime,
        });
      }
    }

    return NextResponse.json({
      ...status,
      generationTime,
    });
  } catch (error) {
    console.error('Remix status error:', error);
    return NextResponse.json(
      { error: 'Failed to check generation status' },
      { status: 500 }
    );
  }
}

