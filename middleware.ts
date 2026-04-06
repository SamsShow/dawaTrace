export { auth as middleware } from '@/lib/auth';

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/batches/:path*',
    '/recalls/:path*',
    '/analytics/:path*',
    '/admin/:path*',
    '/reports/:path*',
    '/invitations/:path*',
  ],
};
