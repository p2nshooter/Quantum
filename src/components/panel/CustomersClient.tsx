'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Customer = {
  id: string;
  name: string;
  company: string | null;
  phone: string;
  email: string | null;
  city: string | null;
  address: string | null;
  npwp: string | null;
  notes: string | null;
};

const EMPTY = {
  name: '',
  company: '',
  phone: '',
  email: '',
  city: '',
  address: '',
  npwp: '',
  notes: ''
};

export function CustomersClient({ initialCustomers, canDelete }: { initialCustomers: Customer[]; canDelete: boolean }) {
  const router = useRouter();
  const [customers, setCustomers] = useState(initialCustomers);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function startEdit(customer: Customer) {
    setEditingId(customer.id);
    setForm({
      name: customer.name,
      company: customer.company ?? '',
      phone: customer.phone,
      email: customer.email ?? '',
      city: customer.city ?? '',
      address: customer.address ?? '',
      npwp: customer.npwp ?? '',
      notes: customer.notes ?? ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function resetForm() {
    setEditingId(null);
    setForm(EMPTY);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const payload = {
      name: form.name,
      company: form.company || null,
      phone: form.phone,
      email: form.email || null,
      city: form.city || null,
      address: form.address || null,
      npwp: form.npwp || null,
      notes: form.notes || null
    };

    try {
      const res = await fetch(editingId ? `/api/panel/customers/${editingId}` : '/api/panel/customers', {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = (await res.json()) as { id?: string; error?: string };
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan pelanggan.');

      if (editingId) {
        setCustomers((prev) => prev.map((c) => (c.id === editingId ? { ...c, ...payload, id: editingId } : c)));
      } else if (data.id) {
        setCustomers((prev) => [{ ...payload, id: data.id! }, ...prev]);
      }
      resetForm();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan pelanggan.');
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm('Hapus pelanggan ini?')) return;
    setError(null);
    try {
      const res = await fetch(`/api/panel/customers/${id}`, { method: 'DELETE' });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || 'Gagal menghapus pelanggan.');
      setCustomers((prev) => prev.filter((c) => c.id !== id));
      if (editingId === id) resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus pelanggan.');
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={save} className="card space-y-4">
        <h2 className="font-bold text-slate-900 dark:text-white">
          {editingId ? 'Ubah pelanggan' : 'Tambah pelanggan'}
        </h2>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <input
            className="input"
            required
            placeholder="Nama PIC *"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <input
            className="input"
            placeholder="Perusahaan / PO"
            value={form.company}
            onChange={(e) => setForm({ ...form, company: e.target.value })}
          />
          <input
            className="input"
            required
            placeholder="Telepon *"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
          <input
            type="email"
            className="input"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <input
            className="input"
            placeholder="Kota"
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
          />
          <input
            className="input"
            placeholder="NPWP"
            value={form.npwp}
            onChange={(e) => setForm({ ...form, npwp: e.target.value })}
          />
          <input
            className="input lg:col-span-2"
            placeholder="Alamat"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
        </div>

        <textarea
          className="input min-h-[70px]"
          placeholder="Catatan internal (opsional)"
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-2">
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Menyimpan…' : editingId ? 'Simpan perubahan' : '+ Tambah pelanggan'}
          </button>
          {editingId && (
            <button type="button" onClick={resetForm} className="btn-secondary">
              Batal
            </button>
          )}
        </div>
      </form>

      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th>Pelanggan</th>
              <th>Kontak</th>
              <th>Kota</th>
              <th>Catatan</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {customers.map((customer) => (
              <tr key={customer.id}>
                <td>
                  <div className="font-semibold text-slate-800 dark:text-slate-100">
                    {customer.company || customer.name}
                  </div>
                  {customer.company && <div className="text-xs text-slate-400">PIC: {customer.name}</div>}
                </td>
                <td>
                  <div>{customer.phone}</div>
                  {customer.email && <div className="text-xs text-slate-400">{customer.email}</div>}
                </td>
                <td>{customer.city || '—'}</td>
                <td className="max-w-xs truncate text-slate-500 dark:text-slate-400">{customer.notes || '—'}</td>
                <td className="whitespace-nowrap text-right">
                  <button onClick={() => startEdit(customer)} className="text-xs font-semibold text-quantum-600 hover:underline">
                    Ubah
                  </button>
                  {canDelete && (
                    <button onClick={() => remove(customer.id)} className="ml-3 text-xs text-red-500 hover:underline">
                      Hapus
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {customers.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-slate-400">
                  Belum ada pelanggan terdaftar.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
