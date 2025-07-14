import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Primary favicon - PNG format for better quality */}
        <link rel="icon" type="image/png" sizes="32x32" href="/gridmate_icon.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/gridmate_icon.png" />
        <link rel="apple-touch-icon" href="/gridmate_icon.png" />
        
        {/* Fallback favicon for older browsers */}
        <link rel="shortcut icon" href="/favicon.ico" />
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
        
        <meta name="description" content="Gridmate - AI-powered financial modeling assistant for Excel" />
        <meta name="theme-color" content="#2563eb" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}