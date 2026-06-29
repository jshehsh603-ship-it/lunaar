import type { Metadata, Viewport } from 'next';
import './globals.css';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: 'Lunaar — Premium Random Video Chat Platform',
  description: 'Instant video chat with real people around the world. Meet, voice call, text, and build friendships on Lunaar.',
  keywords: ['video chat', 'random video chat', 'strangers chat', 'meet people', 'social discovery', 'webrtc video chat'],
  authors: [{ name: 'Lunaar Inc.' }],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="google" content="notranslate" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Outfit:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
        <script src="https://accounts.google.com/gsi/client?hl=en" async defer></script>
      </head>
      <body className="bg-brand-darkBg text-white antialiased min-h-screen flex flex-col font-sans select-none">
        {children}
      </body>
    </html>
  );
}
