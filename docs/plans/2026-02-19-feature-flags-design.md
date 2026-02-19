# Feature Flags System Design

**Date:** 2026-02-19
**Status:** Approved

## Overview

Replace the PostHog feature flag integration with a custom, database-backed feature flag system. The new system supports per-environment configuration, role-based and tenant-based overrides, percentage rollouts, and a super-admin-only management UI built into the existing portal.

## Motivation

PostHog's free tier does not support targeting flags by user properties (role, subscriber ID, etc.) without a paid plan. The requirements map more naturally to a custom solution backed by the existing MySQL database, which avoids external cost and gives full control over evaluation logic and the management UI.

---

## Database Schema

Two new tables added via migration:

```sql
CREATE TABLE feature_flags (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  name                VARCHAR(100) NOT NULL UNIQUE,
  description         TEXT NULL,
  is_enabled          TINYINT(1) NOT NULL DEFAULT 0,   -- global kill switch
  rollout_percentage  INT NOT NULL DEFAULT 100,         -- 0–100
  environment         VARCHAR(50) NOT NULL DEFAULT 'production', -- 'production' | 'staging' | 'development' | 'all'
  created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE feature_flag_overrides (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  flag_id        INT NOT NULL,
  context_type   ENUM('user', 'role', 'subscriber') NOT NULL,
  context_value  VARCHAR(255) NOT NULL,  -- user ID, 'admin'/'manager', or subscriber ID
  is_enabled     TINYINT(1) NOT NULL DEFAULT 1,
  FOREIGN KEY (flag_id) REFERENCES feature_flags(id) ON DELETE CASCADE,
  UNIQUE KEY uq_flag_context (flag_id, context_type, context_value)
);
```

Seed `enable-subscriptions` into `feature_flags` on migration.

---

## Evaluation Logic

`isFeatureEnabled(flagName, context)` evaluates in this exact priority order:

1. **Environment check** — if `flag.environment !== NODE_ENV` and `flag.environment !== 'all'`, return `false`
2. **Global kill switch** — if `flag.is_enabled = 0`, return `false`
3. **User override** — if a `context_type='user'` override exists for `context.userId`, return its `is_enabled`
4. **Role override** — check overrides for `context_type='role'` in order: `admin`, `manager`, `subscriber` — return first match's `is_enabled`
5. **Subscriber override** — if `context.subscriberId` exists and a `context_type='subscriber'` override matches, return its `is_enabled`
6. **Percentage rollout** — hash `context.userId` to a stable 0–99 bucket; return `true` if bucket < `rollout_percentage`

### Context object

```typescript
interface FlagContext {
  userId: string
  isAdmin: boolean
  isManager: boolean
  isSubscriber: boolean
  subscriberId?: number | null
}
```

### Server-side (`src/lib/feature-flags.ts`)

`isFeatureEnabled(flagName, context)` — runs the evaluation against the DB. Used in API routes. Replaces the current PostHog server client.

### Client-side (`src/hooks/useFeatureFlag.ts`)

`useFeatureFlag(flagName)` — fetches from `GET /api/feature-flags/[name]` (passes session context server-side) and returns `boolean | null` (null = loading). Same interface as today — no call sites change.

---

## Super Admin Protection

A new `is_super_admin` column (TINYINT, default 0) on the `employees` table. Added to the auth session and JWT the same way `is_admin` is today.

```typescript
// Session extension
session.user.isSuperAdmin: boolean
```

The `/admin/feature-flags` page and all `/api/admin/feature-flags/*` routes check `session.user.isSuperAdmin`. The nav item only renders when `isSuperAdmin === true`.

A "SYSTEM" section in the admin sidebar (below "BILLING") contains the "Feature Flags" nav item.

---

## Admin UI (`/admin/feature-flags`)

Designed in `docs/redesign.pen` (frame: "Feature Flags").

**Page header:** Title + subtitle, "Super Admin" amber badge, "New Flag" button.

**Flags table columns:**
| Column | Description |
|--------|-------------|
| Flag Name | Monospace name + plain-text description |
| Environment | Color-coded pill: blue=production, green=staging, purple=all |
| Rollout | Progress bar + "X% of users" label |
| Overrides | Colored chips showing context types; "+N" overflow chip |
| Enabled | Toggle (global kill switch) |
| — | "Edit" button to expand inline editor |

**Inline edit panel** (expands below the row, teal border):
- Environment dropdown
- Rollout percentage slider (0–100) with live % display
- Overrides list: each shows type badge (role/user/subscriber), value, enabled toggle, delete button
- "Add Override" button: opens a small form (type select + value input + enabled toggle)
- "Save Changes" button

**New Flag dialog:** name (slug), description, environment, initial rollout percentage.

---

## Migration from PostHog

1. Run new migration (adds `feature_flags`, `feature_flag_overrides`, `is_super_admin` column)
2. Seed `enable-subscriptions` flag
3. Swap `src/lib/feature-flags.ts` to DB-backed implementation
4. Swap `src/hooks/useFeatureFlag.ts` to fetch from `/api/feature-flags/[name]`
5. Remove `posthog-node` and `posthog-js` dependencies
6. Remove `NEXT_PUBLIC_POSTHOG_KEY` / `NEXT_PUBLIC_POSTHOG_HOST` from env

Call sites (`useFeatureFlag`, `isFeatureEnabled`) do not change.

---

## Files to Create / Modify

| File | Change |
|------|--------|
| `src/lib/database/migrations/002_feature_flags.sql` | New migration |
| `src/lib/feature-flags.ts` | Replace PostHog with DB evaluation |
| `src/hooks/useFeatureFlag.ts` | Replace PostHog JS with API fetch |
| `src/app/api/feature-flags/[name]/route.ts` | New — server-evaluates flag for session user |
| `src/app/api/admin/feature-flags/route.ts` | New — list + create flags (super admin) |
| `src/app/api/admin/feature-flags/[id]/route.ts` | New — update + delete flag |
| `src/app/api/admin/feature-flags/[id]/overrides/route.ts` | New — manage overrides |
| `src/app/(portal)/admin/feature-flags/page.tsx` | New — management UI |
| `src/lib/repositories/FeatureFlagRepository.ts` | New — DB queries |
| `src/lib/auth/config.ts` | Add `isSuperAdmin` to session/JWT |
| `src/components/admin/AdminSidebar.tsx` | Add SYSTEM section + Feature Flags nav item |
| `src/lib/database/types.ts` | Regenerate after migration |
