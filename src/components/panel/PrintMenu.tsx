/**
 * Sepasang tautan unduh (PDF & Word) untuk satu jenis dokumen transaksi.
 *
 * Sengaja tautan biasa, bukan tombol ber-JavaScript: peramban langsung
 * menyimpan berkasnya, dan tetap berfungsi walau JavaScript gagal dimuat.
 */
export function PrintMenu({ label, jenis, id }: { label: string; jenis: string; id: string }) {
  const href = (format: 'pdf' | 'doc') => `/api/panel/dokumen/${jenis}/${encodeURIComponent(id)}?format=${format}`;

  return (
    <span className="inline-flex overflow-hidden rounded-xl border border-slate-300 text-xs font-semibold dark:border-slate-700">
      <span className="bg-slate-100 px-3 py-2 text-slate-600 dark:bg-slate-800 dark:text-slate-300">{label}</span>
      <a href={href('pdf')} download className="px-3 py-2 text-quantum-600 transition hover:bg-slate-50 dark:hover:bg-slate-800">
        PDF
      </a>
      <a
        href={href('doc')}
        download
        className="border-l border-slate-200 px-3 py-2 text-quantum-600 transition hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
      >
        Word
      </a>
    </span>
  );
}
