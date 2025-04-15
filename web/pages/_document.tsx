import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <title>KLM App</title>
        <meta name="description" content="Lagerbestandstool" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <link rel="icon" href="/favicon.ico" />

        <meta name="twitter:card" content="summary" />
        <meta name="twitter:url" content="https://klm-app.de" />
        <meta name="twitter:title" content="KLM App" />
        <meta name="twitter:description" content="Lagerbestandstool" />

        <meta property="og:type" content="website" />
        <meta property="og:title" content="KLM App" />
        <meta property="og:description" content="Lagerbestandstool" />
        <meta property="og:site_name" content="KLM App" />
        <meta property="og:url" content="https://klm-app.de" />
      </Head>
      <body className="antialiased">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
