import { drizzle } from 'drizzle-orm/d1';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import * as schema from './schema';

export async function getEnv(): Promise<CloudflareEnv> {
  const ctx = await getCloudflareContext({ async: true });
  return ctx.env;
}

export async function getDb() {
  const env = await getEnv();
  return drizzle(env.DB, { schema });
}
