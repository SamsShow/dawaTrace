'use client';

import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from 'next-themes';
import { ApolloClient, InMemoryCache, ApolloProvider, HttpLink } from '@apollo/client';
import '@/i18n';

const httpLink = new HttpLink({ uri: '/api/graphql' });

const client = new ApolloClient({
  link: httpLink,
  cache: new InMemoryCache(),
});

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        <ApolloProvider client={client}>{children}</ApolloProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
