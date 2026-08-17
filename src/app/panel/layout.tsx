import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { PanelShell } from '@/components/panel/PanelShell';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  // Middleware hanya mengecek keberadaan cookie; pengecekan sesungguhnya
  // (sesi masih berlaku & akun masih aktif) dilakukan di sini terhadap database.
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  return <PanelShell user={user}>{children}</PanelShell>;
}
