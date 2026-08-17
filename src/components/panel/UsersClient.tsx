'use client';

import { useState } from 'react';
import { formatDateTime, type DateLike } from '@/lib/format';
import { USER_ROLES, USER_ROLE_LABEL, type UserRole } from '@/lib/karoseri/constants';

type PanelUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
  lastLoginAt: DateLike;
};

export function UsersClient({ initialUsers, currentUserId }: { initialUsers: PanelUser[]; currentUserId: string }) {
  const [users, setUsers] = useState(initialUsers);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'produksi' as UserRole });
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function addUser(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setSaving(true);
    try {
      const res = await fetch('/api/panel/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = (await res.json()) as { id?: string; error?: string };
      if (!res.ok || !data.id) throw new Error(data.error || 'Gagal menambah pengguna.');

      setUsers((prev) => [
        { id: data.id!, name: form.name, email: form.email, role: form.role, active: true, lastLoginAt: null },
        ...prev
      ]);
      setForm({ name: '', email: '', password: '', role: 'produksi' });
      setNotice('Pengguna dibuat. Sampaikan passwordnya lewat jalur pribadi, bukan grup.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menambah pengguna.');
    } finally {
      setSaving(false);
    }
  }

  async function patch(id: string, payload: Record<string, unknown>) {
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/panel/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || 'Gagal memperbarui pengguna.');
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...payload } : u)));
      if (payload.password) setNotice('Password berhasil direset. Sesi pengguna tersebut otomatis diputus.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memperbarui pengguna.');
    }
  }

  async function resetPassword(id: string) {
    const password = prompt('Password baru (minimal 8 karakter):');
    if (!password) return;
    if (password.length < 8) {
      setError('Password minimal 8 karakter.');
      return;
    }
    await patch(id, { password });
  }

  async function remove(id: string) {
    if (!confirm('Hapus pengguna ini?')) return;
    setError(null);
    try {
      const res = await fetch(`/api/panel/users/${id}`, { method: 'DELETE' });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || 'Gagal menghapus pengguna.');
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus pengguna.');
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={addUser} className="card space-y-4">
        <h2 className="font-bold text-slate-900 dark:text-white">Tambah pengguna</h2>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <input
            className="input"
            required
            placeholder="Nama *"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <input
            type="email"
            className="input"
            required
            placeholder="Email *"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <input
            type="password"
            className="input"
            required
            minLength={8}
            placeholder="Password awal *"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          <select
            className="input"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
            aria-label="Peran"
          >
            {USER_ROLES.map((role) => (
              <option key={role} value={role}>
                {USER_ROLE_LABEL[role]}
              </option>
            ))}
          </select>
        </div>

        <p className="text-xs text-slate-400">
          Kepala Produksi mengelola SPK, tahapan, dan master data. Keuangan mencatat pembayaran. Administrator
          menguasai semuanya termasuk pengelolaan pengguna.
        </p>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {notice && <p className="text-sm text-emerald-600">{notice}</p>}

        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? 'Menyimpan…' : '+ Tambah pengguna'}
        </button>
      </form>

      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th>Nama</th>
              <th>Email</th>
              <th>Peran</th>
              <th>Login terakhir</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td className="font-semibold text-slate-800 dark:text-slate-100">
                  {user.name}
                  {user.id === currentUserId && <span className="ml-2 text-xs text-slate-400">(Anda)</span>}
                </td>
                <td className="text-slate-500 dark:text-slate-400">{user.email}</td>
                <td>
                  <select
                    className="input input-inline h-9 py-1 text-xs"
                    value={user.role}
                    onChange={(e) => patch(user.id, { role: e.target.value as UserRole })}
                    aria-label={`Peran ${user.name}`}
                  >
                    {USER_ROLES.map((role) => (
                      <option key={role} value={role}>
                        {USER_ROLE_LABEL[role]}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="text-slate-400">{formatDateTime(user.lastLoginAt)}</td>
                <td>
                  <button
                    onClick={() => patch(user.id, { active: !user.active })}
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      user.active
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                        : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
                    }`}
                  >
                    {user.active ? 'Aktif' : 'Nonaktif'}
                  </button>
                </td>
                <td className="whitespace-nowrap text-right">
                  <button onClick={() => resetPassword(user.id)} className="text-xs font-semibold text-quantum-600 hover:underline">
                    Reset password
                  </button>
                  {user.id !== currentUserId && (
                    <button onClick={() => remove(user.id)} className="ml-3 text-xs text-red-500 hover:underline">
                      Hapus
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
