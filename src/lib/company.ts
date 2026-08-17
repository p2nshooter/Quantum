/**
 * Identitas perusahaan. Semua teks kontak di halaman publik membaca dari sini —
 * ubah di satu tempat ini saja, tidak perlu menyisir komponen satu per satu.
 *
 * Nilai bertanda GANTI masih placeholder: isi dengan data asli perusahaan
 * sebelum situs dipublikasikan.
 */
export const COMPANY = {
  legalName: 'CV. Quantum Karya Bersama',
  shortName: 'Quantum Karoseri',
  tagline: 'Karoseri bus, truck, dan kendaraan niaga — dikerjakan presisi, tepat waktu.',
  description:
    'CV. Quantum Karya Bersama mengerjakan pembuatan bodi bus, box, wingbox, dump, dan tangki di atas chassis pilihan Anda, dengan progres pengerjaan yang bisa dipantau pelanggan secara online.',
  foundedYear: 2019,

  // GANTI: data kontak asli perusahaan.
  phone: '+62 800-0000-0000',
  whatsapp: '6280000000000',
  email: 'info@quantumkaryabersama.co.id',
  address: 'Jl. Raya Industri No. 00, Kabupaten —, Jawa —, Indonesia',
  mapsUrl: 'https://maps.google.com/?q=CV.+Quantum+Karya+Bersama',
  workingHours: 'Senin–Sabtu, 08.00–17.00 WIB',

  stats: [
    { label: 'Tahun pengalaman', value: '5+' },
    { label: 'Unit diselesaikan', value: '250+' },
    { label: 'Tipe bodi dikerjakan', value: '8' },
    { label: 'Garansi rangka', value: '1 tahun' }
  ]
} as const;

export function whatsappLink(message: string): string {
  return `https://wa.me/${COMPANY.whatsapp}?text=${encodeURIComponent(message)}`;
}
