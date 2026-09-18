import { NextRequest, NextResponse } from 'next/server';
import { resolveJson2VideoApiKey, missingJson2VideoApiKeyMessage } from '@/lib/json2video-api-key';
import { validateJson2VideoPayload } from '@/lib/json2video-payload-validator';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const apiKey = resolveJson2VideoApiKey(req);

    if (!apiKey) {
      return NextResponse.json(
        {
          error: missingJson2VideoApiKeyMessage,
          fallback: 'COPY_PAYLOAD',
          details: 'API key tidak ditemukan di request header maupun environment variable.',
        },
        { status: 403 }
      );
    }

    let payload: any;
    try {
      payload = await req.json();
    } catch (parseError: any) {
      return NextResponse.json(
        {
          error: 'Format payload request tidak valid.',
          fallback: 'COPY_PAYLOAD',
          details: parseError?.message || 'Invalid JSON body',
        },
        { status: 400 }
      );
    }

    // Validate payload against schema and stability constraints
    const validation = validateJson2VideoPayload(payload);
    if (!validation.isValid) {
      return NextResponse.json(
        {
          error: validation.error,
          fallback: 'COPY_PAYLOAD',
          details: validation.details,
        },
        { status: 400 }
      );
    }

    let response: Response;
    try {
      response = await fetch('https://api.json2video.com/v2/movies', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'content-type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
    } catch (networkError: any) {
      console.error('JSON2Video Render API Error (Network/Connection):', networkError);
      return NextResponse.json(
        {
          error:
            'Gagal menghubungi server JSON2Video (Network/Connection error). Silakan gunakan opsi Copy Payload untuk render manual.',
          fallback: 'COPY_PAYLOAD',
          details: networkError?.message || 'Network fetch to api.json2video.com failed',
        },
        { status: 502 }
      );
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error('JSON2Video Render API Error (Upstream Response Not OK):', {
        status: response.status,
        statusText: response.statusText,
        data,
      });

      const userMessage =
        data?.message ||
        data?.error ||
        `Layanan JSON2Video mengembalikan status ${response.status}. Gunakan opsi Copy Payload untuk render manual di dashboard.`;

      const safeDetails =
        typeof data === 'object' && Object.keys(data).length > 0
          ? JSON.stringify(data)
          : response.statusText || `HTTP ${response.status}`;

      const statusToReturn =
        response.status === 401 || response.status === 403
          ? response.status
          : response.status >= 500
          ? 502
          : response.status;

      return NextResponse.json(
        {
          error: userMessage,
          fallback: 'COPY_PAYLOAD',
          details: safeDetails,
        },
        { status: statusToReturn || 502 }
      );
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('JSON2Video Render API Error:', error);
    return NextResponse.json(
      {
        error:
          error?.message ||
          'Terjadi kendala saat memproses render video. Silakan gunakan opsi Copy Payload.',
        fallback: 'COPY_PAYLOAD',
        details: error?.message || 'Unhandled render error',
      },
      { status: 502 }
    );
  }
}
