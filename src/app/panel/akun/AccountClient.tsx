'use client';

import { useState } from 'react';

export function AccountClient() {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);

    if (form.newPassword !== form.confirmPassword) {
      setError('Konfirmasi password tidak sama.');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/auth/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: form.currentPassword, newPassword: form.newPassword })
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || 'Gagal mengubah password.');
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setNotice('Password berhasil diubah. Sesi di perangkat lain otomatis keluar.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengubah password.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="card space-y-4">
      <h2 className="font-bold text-slate-900 dark:text-white">Ubah password</h2>

      <div>
        <label className="label" htmlFor="current">
          Password saat ini
        </label>
        <input
          id="current"
          type="password"
          autoComplete="current-password"
          className="input"
          required
          value={form.currentPassword}
          onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
        />
      </div>

      <div>
        <label className="label" htmlFor="new">
          Password baru
        </label>
        <input
          id="new"
          type="password"
          autoComplete="new-password"
          className="input"
          required
          minLength={8}
          value={form.newPassword}
          onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
        />
      </div>

      <div>
        <label className="label" htmlFor="confirm">
          Ulangi password baru
        </label>
        <input
          id="confirm"
          type="password"
          autoComplete="new-password"
          className="input"
          required
          minLength={8}
          value={form.confirmPassword}
          onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {notice && <p className="text-sm text-emerald-600">{notice}</p>}

      <button type="submit" disabled={saving} className="btn-primary">
        {saving ? 'Menyimpan…' : 'Simpan password baru'}
      </button>
    </form>
  );
}
