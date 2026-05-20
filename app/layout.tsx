import './globals.css';

export const metadata = {
  title: 'Voynich Verified Translation Engine',
  description: 'Experimental AI-free verification engine for Voynich translation hypotheses.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
