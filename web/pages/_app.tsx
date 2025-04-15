import UseSession from '@/hooks/useSession';
import '@/styles/globals.css';
import type { AppProps } from 'next/app';

export default function App({ Component, pageProps }: AppProps) {
  const session = UseSession();

  const appProps = Object.assign(
    {
      session,
    },
    pageProps
  );

  return <Component {...appProps} />;
}
