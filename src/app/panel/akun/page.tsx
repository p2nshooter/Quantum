import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { USER_ROLE_LABEL } from '@/lib/karoseri/constants';
import { AccountClient } from './AccountClient';

export const dynamic = 'force-dynamic';

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white">Akun saya</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Ubah password akun panel Anda.</p>
      </div>

      <div className="card">
        <dl className="grid gap-4 sm:grid-cols-3">
          <div>
            <dt className="text-xs text-slate-400">Nama</dt>
            <dd className="font-semibold">{user.name}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-400">Email</dt>
            <dd className="font-semibold">{user.email}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-400">Peran</dt>
            <dd className="font-semibold">{USER_ROLE_LABEL[user.role]}</dd>
          </div>
        </dl>
      </div>

      <AccountClient />
    </div>
  );
}
