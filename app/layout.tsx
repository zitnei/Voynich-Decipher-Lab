import './globals.css';

export const metadata = {
  title: 'Voynich Real Hypothesis Engine',
  description: 'Hypothesis-scored Japanese reading engine for the Voynich Manuscript.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="ja"><body>{children}</body></html>;
}
