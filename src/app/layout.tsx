import type { Metadata } from 'next';
import { Inter, Cormorant_Garamond } from 'next/font/google';
import Script from 'next/script';
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

const GA_TRACKING_ID = 'G-J8SE3Y177H';

export const metadata: Metadata = {
  title: 'Should I Free Ship? — Smart shipping calculator for wineries',
  description:
    'Find the right shipping strategy for your winery. Compare free shipping, flat rate, and zone-based pricing using your real numbers — COGS, margins, packaging, and shipping zones.',
  keywords: [
    'winery shipping calculator',
    'DTC wine shipping',
    'winery margin calculator',
    'wine ecommerce shipping',
    'free shipping ROI',
    'flat rate shipping wine',
    'winery profitability',
  ],
  authors: [{ name: 'Should I Free Ship' }],
  openGraph: {
    title: 'Should I Free Ship? — Smart shipping calculator for wineries',
    description:
      'Plug in your numbers. See exactly which shipping strategy fits your wines, your margins, and your buyer.',
    url: 'https://shouldifreeship.com',
    siteName: 'Should I Free Ship?',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Should I Free Ship? — Smart shipping calculator for wineries',
    description:
      'Plug in your numbers. See exactly which shipping strategy fits your wines, your margins, and your buyer.',
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
      <head>
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_TRACKING_ID}`}
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_TRACKING_ID}');
          `}
        </Script>
      </head>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}