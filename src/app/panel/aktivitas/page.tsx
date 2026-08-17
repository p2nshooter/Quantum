import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { getRecentAuditLog } from '@/lib/audit';
import { formatDateTime } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function ActivityPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role !== 'admin') redirect('/panel');

  const rows = await getRecentAuditLog(100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white">Log aktivitas</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Seratus perubahan data terakhir beserta pelakunya.
        </p>
      </div>

      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th>Waktu</th>
              <th>Pengguna</th>
              <th>Aksi</th>
              <th>Objek</th>
              <th>Detail</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="whitespace-nowrap text-slate-400">{formatDateTime(row.createdAt)}</td>
                <td>{row.actorName ?? '—'}</td>
                <td className="font-mono text-xs">{row.action}</td>
                <td className="text-slate-500 dark:text-slate-400">
                  {row.targetType ? `${row.targetType}` : '—'}
                </td>
                <td className="max-w-md truncate font-mono text-xs text-slate-400">{row.metaJson ?? '—'}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-slate-400">
                  Belum ada aktivitas tercatat.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
