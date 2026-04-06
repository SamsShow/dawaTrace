import { NextRequest, NextResponse } from 'next/server';
import { listBatches } from '@/lib/server/store';

function batchesToCsv(batches: Awaited<ReturnType<typeof listBatches>>): string {
  const headers = ['batchId', 'manufacturerId', 'drugName', 'composition', 'expiryDate', 'quantity', 'currentCustodian', 'status', 'dataHash', 'suiObjectId', 'createdAt', 'updatedAt'];
  const rows = batches.map(b =>
    headers.map(h => {
      const val = String(b[h as keyof typeof b]);
      return val.includes(',') || val.includes('"') ? `"${val.replace(/"/g, '""')}"` : val;
    }).join(',')
  );
  return [headers.join(','), ...rows].join('\n');
}

export async function GET(req: NextRequest) {
  const format = req.nextUrl.searchParams.get('format') ?? 'csv';
  const batches = await listBatches();
  const timestamp = new Date().toISOString().slice(0, 10);

  if (format === 'json') {
    return new NextResponse(JSON.stringify(batches, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="dawatrace-batches-${timestamp}.json"`,
      },
    });
  }

  return new NextResponse(batchesToCsv(batches), {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="dawatrace-batches-${timestamp}.csv"`,
    },
  });
}
