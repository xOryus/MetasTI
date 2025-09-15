/**
 * App root component
 * Configuração global da aplicação Next.js
 */

import type { AppProps } from 'next/app';
import '@/app/globals.css';
import { FeedbackProvider } from '@/components/FeedbackProvider';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <FeedbackProvider>
      <Component {...pageProps} />
    </FeedbackProvider>
  );
}