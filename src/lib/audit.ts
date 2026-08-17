import { desc, eq } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { auditLog, users } from '@/lib/db/schema';
import { newId } from '@/lib/id';

/**
 * Catat aksi yang mengubah data. Kegagalan menulis log tidak boleh menggagalkan
 * aksi utamanya — log ini catatan pendukung, bukan sumber kebenaran.
 */
export async function logAction(
  actorUserId: string,
  action: string,
  targetType?: string,
  targetId?: string,
  meta?: unknown
): Promise<void> {
  try {
    const db = await getDb();
    await db.insert(auditLog).values({
      id: newId('log'),
      actorUserId,
      action,
      targetType: targetType ?? null,
      targetId: targetId ?? null,
      metaJson: meta ? JSON.stringify(meta) : null
    });
  } catch (err) {
    console.error('Gagal menulis audit log:', err);
  }
}

export async function getRecentAuditLog(limit = 50) {
  const db = await getDb();
  return db
    .select({
      id: auditLog.id,
      action: auditLog.action,
      targetType: auditLog.targetType,
      targetId: auditLog.targetId,
      metaJson: auditLog.metaJson,
      createdAt: auditLog.createdAt,
      actorName: users.name
    })
    .from(auditLog)
    .leftJoin(users, eq(auditLog.actorUserId, users.id))
    .orderBy(desc(auditLog.createdAt))
    .limit(limit);
}
