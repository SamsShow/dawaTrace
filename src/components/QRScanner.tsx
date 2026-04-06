'use client';

import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface QRScannerProps {
  onScan: (data: string) => void;
  onError?: (error: string) => void;
}

export default function QRScanner({ onScan, onError }: QRScannerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (!containerRef.current || started) return;

    const scanner = new Html5Qrcode('qr-reader');
    scannerRef.current = scanner;

    scanner.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 250, height: 250 } },
      (decodedText) => {
        // Extract object ID from URL if it's a full verify URL
        let objectId = decodedText;
        const match = decodedText.match(/\/verify\/(0x[a-fA-F0-9]+)/);
        if (match) {
          objectId = match[1];
        } else if (!objectId.startsWith('0x')) {
          // Not a valid object ID
          return;
        }
        scanner.stop().catch(() => {});
        onScan(objectId);
      },
      () => {}, // ignore scan failures (no QR in frame)
    ).then(() => {
      setStarted(true);
    }).catch((err) => {
      onError?.(typeof err === 'string' ? err : 'Camera access denied or not available');
    });

    return () => {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div id="qr-reader" ref={containerRef} className="w-full" />
    </div>
  );
}
