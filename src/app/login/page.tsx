import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { COMPANY } from '@/lib/company';
import { LogoWordmark } from '@/components/ui/Logo';
import { LoginForm } from './LoginForm';

export const metadata: Metadata = {
  title: 'Masuk Panel',
  robots: { index: false, follow: false }
};

export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect('/panel');

  return (
    <main className="grid min-h-screen place-items-center bg-slate-100 px-4 py-12 dark:bg-slate-950">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-6 flex justify-center" aria-label={COMPANY.legalName}>
          <LogoWordmark />
        </Link>

        <div className="card">
          <h1 className="text-xl font-black text-slate-900 dark:text-white">Masuk panel internal</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Khusus staf {COMPANY.legalName}. Pelanggan dapat memantau unitnya lewat{' '}
            <Link href="/lacak" className="font-semibold text-quantum-600 hover:underline">
              halaman lacak progres
            </Link>
            .
          </p>
          <div className="mt-6">
            <LoginForm />
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          <Link href="/" className="hover:text-quantum-600">
            ← Kembali ke halaman utama
          </Link>
        </p>
      </div>
    </main>
  );
}
