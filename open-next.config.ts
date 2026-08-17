import { defineCloudflareConfig } from '@opennextjs/cloudflare';
import staticAssetsIncrementalCache from '@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache';

// Cache inkremental memakai binding ASSETS milik Worker sendiri, bukan bucket R2
// terpisah — jadi token API Cloudflare untuk deploy tidak perlu izin R2. Aplikasi
// ini hampir seluruhnya dinamis (data produksi real-time), jadi ISR cache
// persisten memang tidak dibutuhkan.
export default defineCloudflareConfig({
  incrementalCache: staticAssetsIncrementalCache
});
