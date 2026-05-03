import type { Metadata } from 'next';
import { Inter, Cormorant_Garamond } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-serif',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Should I Free Ship? — Free shipping calculator for wineries',
  description:
    'Find out if free shipping is profitable for your winery. Plug in COGS, packaging, platform fees, and shipping zones to see your real profit and breakeven point.',
  keywords: [
    'winery free shipping calculator',
    'DTC wine shipping',
    'winery margin calculator',
    'wine ecommerce shipping',
    'free shipping ROI',
    'winery profitability',
  ],
  authors: [{ name: 'Should I Free Ship' }],
  openGraph: {
    title: 'Should I Free Ship? — Free shipping calculator for wineries',
    description:
      'Plug in your numbers. See exactly when free shipping pencils out for your winery.',
    url: 'https://shouldifreeship.com',
    siteName: 'Should I Free Ship?',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Should I Free Ship? — Free shipping calculator for wineries',
    description:
      'Plug in your numbers. See exactly when free shipping pencils out for your winery.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${cormorant.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}