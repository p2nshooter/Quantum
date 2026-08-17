/**
 * Lambang Quantum: bulan sabit "Q" tiga warna (emas–biru–merah) dengan ekor
 * berbentuk kobaran di bawahnya, mengikuti papan nama bengkel.
 *
 * Digambar sebagai SVG inline (bukan berkas gambar) supaya tajam di segala
 * ukuran, ikut warna latar terang/gelap, dan tidak menambah satu pun request.
 */

export const BRAND = {
  gold: '#F2B705',
  blue: '#1B4FD8',
  red: '#E0202B'
} as const;

export function LogoMark({ className = 'h-9 w-9' }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} role="img" aria-label="Logo Quantum">
      {/* Sabit tiga warna, terbuka ke kanan bawah — membentuk huruf Q. */}
      <g fill="none" strokeLinecap="round">
        <path d="M84 38 A 35 35 0 1 0 63 79" stroke={BRAND.gold} strokeWidth="12" />
        <path d="M74 33 A 24 24 0 1 0 57 70" stroke={BRAND.blue} strokeWidth="10" />
        <path d="M65 30 A 15 15 0 1 0 52 62" stroke={BRAND.red} strokeWidth="8" />
      </g>

      {/* Ekor Q: sapuan emas yang melintasi bukaan sabit dan mekar jadi kobaran. */}
      <g fill={BRAND.gold}>
        <path d="M40 60 C 52 72, 68 78, 92 74 C 74 84, 52 84, 38 72 Z" />
        <path d="M46 72 C 56 80, 68 83, 84 82 C 70 89, 54 88, 44 80 Z" />
        <path d="M33 54 C 39 60, 42 66, 41 73 C 35 68, 31 62, 31 55 Z" />
      </g>
    </svg>
  );
}

/** Lambang + nama, dipakai di navigasi situs publik dan halaman login. */
export function LogoWordmark({
  className = '',
  tone = 'dark'
}: {
  className?: string;
  tone?: 'dark' | 'light';
}) {
  const primary = tone === 'light' ? 'text-white' : 'text-slate-900 dark:text-white';

  return (
    <span className={`flex items-center gap-2.5 ${className}`}>
      <LogoMark />
      <span className="leading-tight">
        <span className={`block text-base font-black tracking-tight ${primary}`}>QUANTUM</span>
        <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-quantum-600">
          Karya Bersama
        </span>
      </span>
    </span>
  );
}
