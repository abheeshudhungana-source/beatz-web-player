import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Beatz - AI-Powered Spotify Web Player',
  description: 'Unlocking free on-demand track selection, real-time queue orchestration, and conversational AI music curation.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-spotify-dark text-white min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
