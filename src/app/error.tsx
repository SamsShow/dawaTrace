'use client';

import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('App error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-destructive/50">
        <CardHeader className="items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 mb-2">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle>Something went wrong</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-sm text-muted-foreground">{error.message || 'An unexpected error occurred.'}</p>
          {error.digest && (
            <p className="text-xs font-mono text-muted-foreground">Error ID: {error.digest}</p>
          )}
          <div className="flex gap-2 justify-center">
            <Button onClick={reset}>Try again</Button>
            <Button variant="outline" onClick={() => window.location.href = '/dashboard'}>Go to dashboard</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
