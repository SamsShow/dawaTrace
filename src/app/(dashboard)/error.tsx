'use client';

import { useEffect } from 'react';
import ErrorAlert from '@/components/ErrorAlert';

export default function DashboardError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error('Dashboard error:', error);
  }, [error]);

  return (
    <div className="p-6">
      <ErrorAlert
        title="Dashboard Error"
        message={error.message || 'Failed to load this page. Please try again.'}
        retry={reset}
      />
    </div>
  );
}
