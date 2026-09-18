import { NextRequest, NextResponse } from 'next/server';
import { resolveJson2VideoApiKey, missingJson2VideoApiKeyMessage } from '@/lib/json2video-api-key';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
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

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id') || searchParams.get('project');

    if (!id) {
      return NextResponse.json(
        {
          error: 'ID render (project ID) tidak ditemukan.',
          fallback: 'COPY_PAYLOAD',
          details: 'Query parameter "id" atau "project" diperlukan.',
        },
        { status: 400 }
      );
    }

    let response: Response;
    try {
      response = await fetch(
        `https://api.json2video.com/v2/movies?project=${encodeURIComponent(id)}`,
        {
          method: 'GET',
          headers: {
            'x-api-key': apiKey,
          },
        }
      );
    } catch (networkError: any) {
      console.error('JSON2Video Status API Error (Network/Connection):', networkError);
      return NextResponse.json(
        {
          error:
            'Gagal terhubung ke layanan JSON2Video untuk memeriksa status render.',
          fallback: 'COPY_PAYLOAD',
          details: networkError?.message || 'Network fetch to api.json2video.com status failed',
        },
        { status: 502 }
      );
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error('JSON2Video Status API Error (Upstream Response Not OK):', {
        status: response.status,
        statusText: response.statusText,
        data,
      });

      const userMessage =
        data?.message ||
        data?.error ||
        `Gagal mengambil status render dari JSON2Video (Status ${response.status}).`;

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
    console.error('JSON2Video Status API Error:', error);
    return NextResponse.json(
      {
        error:
          error?.message ||
          'Terjadi kendala saat memeriksa status render video.',
        fallback: 'COPY_PAYLOAD',
        details: error?.message || 'Unhandled status check error',
      },
      { status: 502 }
    );
  }
}
