'use client';

import { useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BatchQRCodeProps {
  suiObjectId: string;
  batchId: string;
  size?: number;
}

export default function BatchQRCode({ suiObjectId, batchId, size = 200 }: BatchQRCodeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const verifyUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/verify/${suiObjectId}`;

  useEffect(() => {
    if (!canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, verifyUrl, {
      width: size,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' },
    }).catch(() => {});
  }, [verifyUrl, size]);

  const handleDownload = () => {
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    link.download = `dawatrace-qr-${batchId}.png`;
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <canvas ref={canvasRef} className="rounded-lg" />
      <p className="text-[11px] text-muted-foreground text-center max-w-[200px] break-all font-mono">{batchId}</p>
      <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={handleDownload}>
        <Download className="h-3 w-3" /> Download QR
      </Button>
    </div>
  );
}
