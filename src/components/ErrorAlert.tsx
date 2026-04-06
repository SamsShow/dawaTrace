'use client';

import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface ErrorAlertProps {
  title?: string;
  message: string;
  retry?: () => void;
}

export default function ErrorAlert({ title = 'Something went wrong', message, retry }: ErrorAlertProps) {
  return (
    <Card className="border-destructive/50">
      <CardContent className="flex items-start gap-3 py-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-destructive/10">
          <AlertTriangle className="h-4 w-4 text-destructive" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">{title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{message}</p>
        </div>
        {retry && (
          <Button variant="outline" size="sm" className="shrink-0 text-xs gap-1.5" onClick={retry}>
            <RefreshCw className="h-3 w-3" /> Retry
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
