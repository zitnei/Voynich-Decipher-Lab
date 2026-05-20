import './globals.css';

export const metadata = {
  title: 'Voynich Japanese Book Reader',
  description: 'Book-style Voynich manuscript reader with Japanese hypothesis translations.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="ja"><body>{children}</body></html>;
}
