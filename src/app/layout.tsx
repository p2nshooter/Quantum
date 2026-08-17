import type { Metadata } from 'next';
import './globals.css';
import { COMPANY } from '@/lib/company';

export const metadata: Metadata = {
  title: {
    default: `${COMPANY.legalName} — ${COMPANY.businessLine}`,
    template: `%s | ${COMPANY.shortName}`
  },
  description: COMPANY.description,
  openGraph: {
    title: COMPANY.legalName,
    description: COMPANY.description,
    type: 'website',
    locale: 'id_ID'
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
