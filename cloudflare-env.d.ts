// Menambah tipe `CloudflareEnv` milik OpenNext dengan binding & secret proyek ini.
// Jaga tetap sinkron dengan wrangler.jsonc dan daftar secret di README.md.
declare global {
  interface CloudflareEnv {
    DB: D1Database;
    QUANTUM_KV: KVNamespace;

    APP_URL?: string;

    /** Opsional: notifikasi lead/penawaran masuk ke WhatsApp/Telegram. */
    NOTIFY_WEBHOOK_URL?: string;
  }
}

export {};
