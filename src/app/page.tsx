import Link from 'next/link';
import { asc, eq } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { bodyModels } from '@/lib/db/schema';
import { SiteFooter, SiteNav } from '@/components/site/SiteNav';
import { QuoteForm } from '@/components/site/QuoteForm';
import { COMPANY, whatsappLink } from '@/lib/company';
import { LogoMark } from '@/components/ui/Logo';
import { formatIdrShort } from '@/lib/format';
import { STAGE_TEMPLATES, UNIT_TYPE_LABEL } from '@/lib/karoseri/constants';

export const dynamic = 'force-dynamic';

/** Tiga lini pekerjaan bengkel, sesuai papan nama dan spanduk di lokasi. */
const SERVICE_GROUPS = [
  {
    icon: '🚌',
    title: 'Karoseri',
    text: 'Pembuatan bodi di atas chassis pilihan Anda.',
    items: ['Bodi bus besar & medium', 'Microbus', 'Box besi & aluminium', 'Wingbox', 'Dump', 'Tangki']
  },
  {
    icon: '🎨',
    title: 'Body Repair',
    text: 'Perbaikan dan pengecatan bodi kendaraan.',
    items: ['Body repair', 'Cat mobil', 'Repaint', 'Refinishing', 'Poles body']
  },
  {
    icon: '🔧',
    title: 'Service Mobil',
    text: 'Perawatan berkala sampai perbaikan besar.',
    items: [
      'Service mesin & turun mesin',
      'Tune up',
      'Ganti oli',
      'Rem & kaki-kaki',
      'Transmisi MT/AT',
      'Service AC',
      'Scanner mobil'
    ]
  }
];

const ADVANTAGES = [
  {
    title: 'Progres bisa dipantau online',
    text: 'Setiap unit karoseri punya nomor SPK. Pelanggan memantau tahap pengerjaan kapan saja tanpa perlu menelepon bengkel.'
  },
  {
    title: 'Tahapan kerja terukur',
    text: 'Pengerjaan dipecah ke tahapan baku dengan bobot dan penanggung jawab, sehingga jadwal serah terima realistis.'
  },
  {
    title: 'Rangka & finishing presisi',
    text: 'Rangka dikerjakan dengan jig, pengecatan bertahap dari epoxy hingga clear coat, dan QC sebelum serah terima.'
  }
];

export default async function HomePage() {
  const db = await getDb();
  const models = await db
    .select()
    .from(bodyModels)
    .where(eq(bodyModels.active, true))
    .orderBy(asc(bodyModels.code))
    .limit(9);

  const busProcess = STAGE_TEMPLATES.bus_besar;

  return (
    <>
      <SiteNav />

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden bg-slate-900 text-white">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(27,79,216,0.40),transparent_55%),radial-gradient(circle_at_80%_0%,rgba(242,183,5,0.22),transparent_45%)]" />
          <div className="container-page relative grid gap-10 py-20 lg:grid-cols-2 lg:items-center lg:py-28">
            <div>
              <span className="inline-flex items-center gap-2.5 rounded-full bg-white/10 py-1.5 pl-1.5 pr-4">
                <LogoMark className="h-8 w-8" />
                <span className="text-xs font-semibold uppercase tracking-widest text-gold-300">
                  {COMPANY.legalName}
                </span>
              </span>
              <h1 className="mt-5 text-4xl font-black leading-tight sm:text-5xl">
                Karoseri, body repair &amp; service mobil —{' '}
                <span className="text-gold-400">solusi tepat untuk mobil Anda.</span>
              </h1>
              <p className="mt-5 max-w-xl text-base text-slate-300">{COMPANY.pitch}</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a href="#penawaran" className="btn-accent">
                  Minta penawaran
                </a>
                <Link
                  href="/lacak"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/25 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  Lacak progres unit
                </Link>
              </div>

              <ul className="mt-12 flex flex-wrap gap-x-8 gap-y-3">
                {COMPANY.highlights.map((item) => (
                  <li key={item.label} className="flex items-center gap-2 text-sm text-slate-300">
                    <span aria-hidden="true">{item.icon}</span>
                    {item.label}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
              <p className="text-sm font-semibold uppercase tracking-wide text-quantum-200">Tahapan pengerjaan bus</p>
              <ol className="mt-4 space-y-3">
                {busProcess.slice(0, 6).map((stage, index) => (
                  <li key={stage.name} className="flex items-center gap-3">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-quantum-600 text-xs font-bold">
                      {index + 1}
                    </span>
                    <span className="flex-1 text-sm text-slate-200">{stage.name}</span>
                    <span className="text-xs text-slate-400">{stage.weightPercent}%</span>
                  </li>
                ))}
              </ol>
              <p className="mt-4 text-xs text-slate-400">
                …dan {busProcess.length - 6} tahapan lanjutan hingga QC dan serah terima. Setiap tahap tercatat tanggal
                mulai, selesai, dan penanggung jawabnya.
              </p>
            </div>
          </div>
        </section>

        {/* Layanan */}
        <section id="layanan" className="py-20">
          <div className="container-page">
            <h2 className="text-3xl font-black text-slate-900 dark:text-white">Layanan kami</h2>
            <p className="mt-2 max-w-2xl text-slate-500 dark:text-slate-400">
              Satu bengkel untuk tiga kebutuhan: membangun bodi, memperbaiki bodi, dan merawat mesin.
            </p>

            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {SERVICE_GROUPS.map((service) => (
                <div key={service.title} className="card">
                  <span className="text-3xl">{service.icon}</span>
                  <h3 className="mt-3 text-lg font-bold text-slate-900 dark:text-white">{service.title}</h3>
                  <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">{service.text}</p>
                  <ul className="mt-4 space-y-1.5 border-t border-slate-100 pt-4 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-300">
                    {service.items.map((item) => (
                      <li key={item} className="flex gap-2">
                        <span className="text-gold-500" aria-hidden="true">
                          ✓
                        </span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Katalog model */}
        <section id="katalog" className="border-y border-slate-200 bg-white py-20 dark:border-slate-800 dark:bg-slate-900">
          <div className="container-page">
            <h2 className="text-3xl font-black text-slate-900 dark:text-white">Katalog model bodi</h2>
            <p className="mt-2 max-w-2xl text-slate-500 dark:text-slate-400">
              Harga di bawah adalah estimasi awal per unit dan masih menyesuaikan spesifikasi, chassis, serta material
              pilihan Anda.
            </p>

            {models.length === 0 ? (
              <p className="mt-10 rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-700">
                Katalog belum diisi. Tim internal dapat menambahkannya lewat Panel → Model Bodi.
              </p>
            ) : (
              <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {models.map((model) => (
                  <article key={model.id} className="card flex flex-col">
                    <span className="text-xs font-semibold uppercase tracking-wide text-quantum-600">
                      {UNIT_TYPE_LABEL[model.unitType]}
                    </span>
                    <h3 className="mt-1.5 text-lg font-bold text-slate-900 dark:text-white">{model.name}</h3>
                    {model.description && (
                      <p className="mt-1.5 flex-1 text-sm text-slate-500 dark:text-slate-400">{model.description}</p>
                    )}
                    <dl className="mt-4 flex items-end justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
                      <div>
                        <dt className="text-xs text-slate-400">Mulai dari</dt>
                        <dd className="text-lg font-black text-slate-900 dark:text-white">
                          {formatIdrShort(model.basePriceIdr)}
                        </dd>
                      </div>
                      <div className="text-right">
                        <dt className="text-xs text-slate-400">Estimasi</dt>
                        <dd className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                          {model.estimatedDays} hari
                        </dd>
                      </div>
                    </dl>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Proses & keunggulan */}
        <section id="proses" className="py-20">
          <div className="container-page grid gap-12 lg:grid-cols-2">
            <div>
              <h2 className="text-3xl font-black text-slate-900 dark:text-white">Cara kerja kami</h2>
              <ol className="mt-8 space-y-6">
                {[
                  ['Konsultasi & survei', 'Kami bahas kebutuhan, chassis, dan spesifikasi bodi yang Anda inginkan.'],
                  ['Penawaran & kontrak', 'Rincian harga, termin pembayaran, dan target serah terima disepakati tertulis.'],
                  ['Penerbitan SPK', 'Unit masuk antrian produksi dengan nomor SPK sebagai identitas pengerjaannya.'],
                  ['Produksi bertahap', 'Rangka, plat, pengecatan, kelistrikan, hingga interior — semua tercatat progresnya.'],
                  ['QC & uji jalan', 'Pemeriksaan akhir sebelum unit dinyatakan siap serah terima.'],
                  ['Serah terima & garansi', 'Unit diserahkan lengkap dengan dokumen dan masa garansi rangka.']
                ].map(([title, text], index) => (
                  <li key={title} className="flex gap-4">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-quantum-600 text-sm font-bold text-white">
                      {index + 1}
                    </span>
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white">{title}</h3>
                      <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{text}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            <div>
              <h2 className="text-3xl font-black text-slate-900 dark:text-white">Kenapa Quantum</h2>
              <div className="mt-8 space-y-4">
                {ADVANTAGES.map((item) => (
                  <div key={item.title} className="card">
                    <h3 className="font-bold text-slate-900 dark:text-white">{item.title}</h3>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{item.text}</p>
                  </div>
                ))}
              </div>

              {/*
                Sengaja tidak memakai kelas `.card`: `.card` mengunci `bg-white` dan
                menang atas utility warna, sehingga kartu ini jadi putih dengan teks
                putih — sama sekali tidak terbaca.
              */}
              <div className="mt-6 rounded-2xl bg-quantum-600 p-5 text-white shadow-sm dark:bg-quantum-700">
                <h3 className="text-lg font-bold">Sudah jadi pelanggan kami?</h3>
                <p className="mt-1 text-sm text-quantum-100">
                  Cek posisi pengerjaan unit Anda dengan nomor SPK dan nomor rangka.
                </p>
                <Link
                  href="/lacak"
                  className="mt-4 inline-flex rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-quantum-700 transition hover:bg-quantum-50"
                >
                  Lacak progres sekarang
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Form penawaran */}
        <section id="penawaran" className="border-t border-slate-200 bg-white py-20 dark:border-slate-800 dark:bg-slate-900">
          <div className="container-page grid gap-10 lg:grid-cols-[1fr_1.2fr] lg:items-start">
            <div>
              <h2 className="text-3xl font-black text-slate-900 dark:text-white">Minta penawaran</h2>
              <p className="mt-2 text-slate-500 dark:text-slate-400">
                Isi kebutuhan Anda, tim kami menyiapkan rincian harga dan estimasi waktu pengerjaan.
              </p>

              {/* Kontak yang belum diisi di src/lib/company.ts disembunyikan, bukan ditampilkan kosong. */}
              <dl className="mt-8 space-y-4 text-sm">
                <div>
                  <dt className="font-semibold text-slate-900 dark:text-white">Telepon / WhatsApp</dt>
                  <dd className="text-slate-500 dark:text-slate-400">{COMPANY.phone}</dd>
                </div>
                {COMPANY.email && (
                  <div>
                    <dt className="font-semibold text-slate-900 dark:text-white">Email</dt>
                    <dd className="text-slate-500 dark:text-slate-400">{COMPANY.email}</dd>
                  </div>
                )}
                <div>
                  <dt className="font-semibold text-slate-900 dark:text-white">Bengkel</dt>
                  <dd className="text-slate-500 dark:text-slate-400">
                    {COMPANY.addressLine}
                    <br />
                    {COMPANY.addressRegion}
                  </dd>
                  <dd className="mt-1">
                    <a
                      href={COMPANY.mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-quantum-600 hover:underline"
                    >
                      Buka di Google Maps →
                    </a>
                  </dd>
                </div>
                {COMPANY.workingHours && (
                  <div>
                    <dt className="font-semibold text-slate-900 dark:text-white">Jam kerja</dt>
                    <dd className="text-slate-500 dark:text-slate-400">{COMPANY.workingHours}</dd>
                  </div>
                )}
              </dl>

              <a
                href={whatsappLink('Halo, saya ingin konsultasi pengerjaan mobil di Bengkel Quantum.')}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-accent mt-6"
              >
                Chat WhatsApp
              </a>
            </div>

            <QuoteForm />
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
