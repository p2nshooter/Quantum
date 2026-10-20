# Quantum — standing rules

These rules come from the owner and apply to every change in this repository.

## Storage: R2 only — never D1

Owner, 20 Oct 2026: „Catat ya baik di axto.io maupun di xaa.es, ulyah.com  xad.es 1fr.fr tilawa.de dan semua yg membutuhkan penyimpanan, wajib ke R2, jgn pernah ke D1".

- Everything this site or app needs to store — records and files — goes to **Cloudflare R2**. Never create a D1 database, never add a `d1_databases` binding, never write a D1 query, never "temporarily" use D1.
- Use the R2 Store design shared by axto.io and xaa.es (`docs/R2-DATA-BLUEPRINT.md` §3 in the guardian-ai and xaa repositories): one JSON object per document, create-once writes (`If-None-Match: *`) for unique values, compare-and-swap updates (`etagMatches`), index entries with `customMetadata`, append-only logs, no hot keys (R2 takes one write per second per key), daily backups to a private bucket kept 35 days.
- Workers KV is not D1: short-lived caches and rate-limit counters only; durable data never lives there.
- **Still to move:** this Worker (`quantum-karoseri`) binds the D1 database `quantum_db`. Its records move to an R2 data bucket the same way as xaa.es (copy once with the same ids, check every row arrived, D1 read-only for 7 days, then the binding is removed). Until then, nothing new is added to D1.
