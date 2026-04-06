import { NextRequest, NextResponse } from 'next/server';
import { listRecalls } from '@/lib/server/store';

function recallsToCsv(recalls: Awaited<ReturnType<typeof listRecalls>>): string {
  const headers = ['batchId', 'regulatorId', 'reason', 'timestamp', 'suiTxDigest'];
  const rows = recalls.map(r =>
    headers.map(h => {
      const val = String(r[h as keyof typeof r]);
      return val.includes(',') || val.includes('"') ? `"${val.replace(/"/g, '""')}"` : val;
    }).join(',')
  );
  return [headers.join(','), ...rows].join('\n');
}

export async function GET(req: NextRequest) {
  const format = req.nextUrl.searchParams.get('format') ?? 'csv';
  const recalls = await listRecalls();
  const timestamp = new Date().toISOString().slice(0, 10);

  if (format === 'json') {
    return new NextResponse(JSON.stringify(recalls, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="dawatrace-recalls-${timestamp}.json"`,
      },
    });
  }

  return new NextResponse(recallsToCsv(recalls), {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="dawatrace-recalls-${timestamp}.csv"`,
    },
  });
}
