# SyncUp-Specific Integration Notes

> **Private**: This document is for internal use and will not be included in public releases.

---

## How SyncUp Maps to the Standard

| Standard Concept | BrandSyncUp | LegalSyncUp |
|-----------------|-------------|-------------|
| **T0** | SyncUpSuite platform | SyncUpSuite platform |
| **T1** | BrandSyncUp (brandsyncup.com) | LegalSyncUp (legalsyncup.com) |
| **T2** | Client organizations | Law firms / compliance teams |
| **API Layer** | tRPC 11 (`src/server/`) | Custom Worker API (`src/workers/`) |
| **Auth** | Better Auth + Firebase (partial) | Better Auth (worker reimplementation) |
| **Tokens** | Custom pipeline (style-dictionary.config.cjs) | Style Dictionary |
| **Database** | Neon branch: brandsyncup-prod | Neon branch: legalsyncup-prod |

## Shared Infrastructure

- **Neon Project**: `syncup-brand-legal` (ID: `polished-truth-90679079`)
- **Auth Schema**: `neon_auth` (shared across both apps)
- **KV Namespace**: `43b75292cfc44ed5b0483a1a030dee9f` (CACHE, shared)
- **Cloudflare Account**: `6b078bcaa9984a2d1dbe483e65c741b0`

## Current Gaps vs Standard

### BrandSyncUp
- [x] 3-tier tenant model (via tenant tables)
- [x] Better Auth sessions
- [x] Design tokens (custom pipeline)
- [ ] Graduated auth (currently binary: logged in or not)
- [ ] Firebase Identity Platform integration
- [ ] Tailwind v4 migration (currently v3)
- [ ] Cultural overlay support

### LegalSyncUp
- [x] Better Auth (worker-level reimplementation)
- [x] Neon with RLS
- [ ] 3-tier tenant model (single-tenant today)
- [ ] Design token pipeline
- [ ] Graduated auth
- [ ] Firebase Identity Platform
- [ ] Tailwind v4

## Migration Priority

1. **LegalSyncUp auth alignment** — Replace manual Better Auth reimplementation with standard `graduated-auth` skill pattern
2. **BrandSyncUp graduated auth** — Add ANONYMOUS/PREVIEW levels for public features
3. **Token pipeline alignment** — Both apps adopt the standard DTCG token format
4. **Tailwind v4 migration** — Both apps migrate from v3 to v4

## Key Files to Reference

### BrandSyncUp
- Auth context: `src/contexts/EnhancedAuthContext.tsx`
- Server entry: `src/server/index.ts`
- Token pipeline: `style-dictionary.config.cjs`
- Vite config: `vite.config.ts` (vendor-react chunk pattern)

### LegalSyncUp
- Auth handler: `src/workers/api/handlers/auth.ts`
- Auth client: `src/lib/auth/client.ts`
- Worker entry: `src/workers/api/index.ts`
