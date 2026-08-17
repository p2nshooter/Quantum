import { notFound } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { getServiceOrderDetail } from '@/lib/data/service-orders';
import { ServiceOrderDetailClient, type ServiceOrderDetail } from '@/components/panel/ServiceOrderDetailClient';

export const dynamic = 'force-dynamic';

export default async function ServiceOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [user, detail] = await Promise.all([getCurrentUser(), getServiceOrderDetail(id)]);
  if (!detail) notFound();

  const role = user?.role;
  const canWrite = role === 'admin' || role === 'produksi' || role === 'keuangan';
  const canPay = role === 'admin' || role === 'keuangan';

  return (
    <ServiceOrderDetailClient
      initialDetail={detail as unknown as ServiceOrderDetail}
      canWrite={canWrite}
      canPay={canPay}
      canDelete={canPay}
    />
  );
}
