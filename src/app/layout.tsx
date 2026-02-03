import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Retailer Portal',
  description: 'Order products from our catalog',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
