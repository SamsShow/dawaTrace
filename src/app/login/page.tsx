import { Suspense } from 'react';
import AuthPage from './auth-page';

export default function LoginPage() {
  return (
    <Suspense>
      <AuthPage />
    </Suspense>
  );
}
