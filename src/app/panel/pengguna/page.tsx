import { redirect } from 'next/navigation';
import { desc } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { users } from '@/lib/db/schema';
import { getCurrentUser } from '@/lib/auth/session';
import { UsersClient } from '@/components/panel/UsersClient';

export const dynamic = 'force-dynamic';

export default async function UsersPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role !== 'admin') redirect('/panel');

  const db = await getDb();
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      active: users.active,
      lastLoginAt: users.lastLoginAt
    })
    .from(users)
    .orderBy(desc(users.createdAt));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white">Pengguna panel</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Akun staf yang boleh masuk ke panel internal beserta perannya.
        </p>
      </div>

      <UsersClient initialUsers={rows} currentUserId={user.id} />
    </div>
  );
}
