import './globals.css';

export const metadata = {
  title: 'Voynich Scientific Decipherment Platform',
  description: 'Reproducible research platform for testing Voynich translation hypotheses.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
