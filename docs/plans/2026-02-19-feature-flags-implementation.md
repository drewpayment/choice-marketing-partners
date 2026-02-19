# Feature Flags Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace PostHog feature flags with a custom DB-backed system supporting environment, role, tenant, and percentage targeting, plus a super-admin management UI.

**Architecture:** Two new MySQL tables (`feature_flags`, `feature_flag_overrides`) hold flag config. A `FeatureFlagRepository` evaluates flags server-side via priority rules (environment → kill switch → user override → role override → subscriber override → percentage hash). The existing `isFeatureEnabled` and `useFeatureFlag` interfaces stay identical so no call sites change.

**Tech Stack:** Next.js 15, TypeScript, Kysely (MySQL), NextAuth, shadcn/ui, Jest (unit tests with mocked DB)

---

## Task 1: Database Migration

**Files:**
- Create: `src/lib/database/migrations/002_feature_flags.sql`

**Step 1: Write the migration file**

```sql
-- Feature flags migration (idempotent)

ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS is_super_admin TINYINT(1) NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS feature_flags (
  id                 INT AUTO_INCREMENT PRIMARY KEY,
  name               VARCHAR(100) NOT NULL UNIQUE,
  description        TEXT NULL,
  is_enabled         TINYINT(1) NOT NULL DEFAULT 0,
  rollout_percentage INT NOT NULL DEFAULT 100,
  environment        VARCHAR(50) NOT NULL DEFAULT 'production',
  created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS feature_flag_overrides (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  flag_id        INT NOT NULL,
  context_type   ENUM('user', 'role', 'subscriber') NOT NULL,
  context_value  VARCHAR(255) NOT NULL,
  is_enabled     TINYINT(1) NOT NULL DEFAULT 1,
  FOREIGN KEY (flag_id) REFERENCES feature_flags(id) ON DELETE CASCADE,
  UNIQUE KEY uq_flag_context (flag_id, context_type, context_value)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed enable-subscriptions flag (enabled, 100% rollout, production)
INSERT IGNORE INTO feature_flags (name, description, is_enabled, rollout_percentage, environment)
VALUES ('enable-subscriptions', 'Billing & subscription management', 1, 100, 'production');
```

**Step 2: Run the migration against your local DB**

```bash
mysql -u root -p your_db_name < src/lib/database/migrations/002_feature_flags.sql
```

Expected: No errors. Verify with `SHOW TABLES LIKE 'feature_flag%';` — should see both tables.

**Step 3: Regenerate Kysely types**

```bash
bun run kysely-codegen
```

Expected: `src/lib/database/types.ts` updated with `FeatureFlags` and `FeatureFlagOverrides` interfaces.

**Step 4: Commit**

```bash
git add src/lib/database/migrations/002_feature_flags.sql src/lib/database/types.ts
git commit -m "feat: add feature_flags migration and regenerate types"
```

---

## Task 2: FeatureFlagRepository

**Files:**
- Create: `src/lib/repositories/FeatureFlagRepository.ts`
- Create: `src/lib/repositories/__tests__/FeatureFlagRepository.test.ts`

**Step 1: Write the failing tests**

```typescript
// src/lib/repositories/__tests__/FeatureFlagRepository.test.ts
import { FeatureFlagRepository, FlagContext } from '../FeatureFlagRepository'
import { db } from '@/lib/database/client'

jest.mock('@/lib/database/client', () => ({
  db: {
    selectFrom: jest.fn(),
    insertInto: jest.fn(),
    updateTable: jest.fn(),
    deleteFrom: jest.fn(),
  },
}))

const mockSelect = (rows: unknown[]) => ({
  leftJoin: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  selectAll: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  execute: jest.fn().mockResolvedValue(rows),
  executeTakeFirst: jest.fn().mockResolvedValue(rows[0] ?? undefined),
})

describe('FeatureFlagRepository', () => {
  let repo: FeatureFlagRepository

  beforeEach(() => {
    repo = new FeatureFlagRepository()
    jest.clearAllMocks()
  })

  const baseContext: FlagContext = {
    userId: '42',
    isAdmin: false,
    isManager: false,
    isSubscriber: false,
    subscriberId: null,
  }

  describe('evaluateFlag', () => {
    it('returns false when flag does not exist', async () => {
      ;(db.selectFrom as jest.Mock).mockReturnValue(mockSelect([]))
      const result = await repo.evaluateFlag('nonexistent', baseContext)
      expect(result).toBe(false)
    })

    it('returns false when is_enabled = 0 (kill switch)', async () => {
      ;(db.selectFrom as jest.Mock).mockReturnValue(
        mockSelect([{ id: 1, name: 'test', is_enabled: 0, rollout_percentage: 100, environment: 'production' }])
      )
      const result = await repo.evaluateFlag('test', baseContext)
      expect(result).toBe(false)
    })

    it('returns false when environment does not match', async () => {
      ;(db.selectFrom as jest.Mock).mockReturnValue(
        mockSelect([{ id: 1, name: 'test', is_enabled: 1, rollout_percentage: 100, environment: 'staging' }])
      )
      // NODE_ENV is 'test' in jest, not 'staging'
      const result = await repo.evaluateFlag('test', baseContext)
      expect(result).toBe(false)
    })

    it('returns true when environment is "all" and flag is enabled', async () => {
      ;(db.selectFrom as jest.Mock)
        .mockReturnValueOnce(mockSelect([{ id: 1, name: 'test', is_enabled: 1, rollout_percentage: 100, environment: 'all' }]))
        .mockReturnValueOnce(mockSelect([]))
      const result = await repo.evaluateFlag('test', baseContext)
      expect(result).toBe(true)
    })

    it('respects user override over rollout percentage', async () => {
      ;(db.selectFrom as jest.Mock)
        .mockReturnValueOnce(mockSelect([{ id: 1, name: 'test', is_enabled: 1, rollout_percentage: 0, environment: 'all' }]))
        .mockReturnValueOnce(mockSelect([
          { context_type: 'user', context_value: '42', is_enabled: 1 },
        ]))
      const result = await repo.evaluateFlag('test', { ...baseContext, userId: '42' })
      expect(result).toBe(true)
    })

    it('respects role override for admin', async () => {
      ;(db.selectFrom as jest.Mock)
        .mockReturnValueOnce(mockSelect([{ id: 1, name: 'test', is_enabled: 1, rollout_percentage: 0, environment: 'all' }]))
        .mockReturnValueOnce(mockSelect([
          { context_type: 'role', context_value: 'admin', is_enabled: 1 },
        ]))
      const result = await repo.evaluateFlag('test', { ...baseContext, isAdmin: true })
      expect(result).toBe(true)
    })

    it('returns false when rollout_percentage is 0 and no overrides match', async () => {
      ;(db.selectFrom as jest.Mock)
        .mockReturnValueOnce(mockSelect([{ id: 1, name: 'test', is_enabled: 1, rollout_percentage: 0, environment: 'all' }]))
        .mockReturnValueOnce(mockSelect([]))
      const result = await repo.evaluateFlag('test', baseContext)
      expect(result).toBe(false)
    })
  })

  describe('listFlags', () => {
    it('returns all flags with their overrides', async () => {
      ;(db.selectFrom as jest.Mock).mockReturnValue(
        mockSelect([{ id: 1, name: 'enable-subscriptions', is_enabled: 1, rollout_percentage: 100, environment: 'production', description: null }])
      )
      const result = await repo.listFlags()
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('enable-subscriptions')
    })
  })
})
```

**Step 2: Run tests to verify they fail**

```bash
bun test src/lib/repositories/__tests__/FeatureFlagRepository.test.ts
```

Expected: FAIL — `Cannot find module '../FeatureFlagRepository'`

**Step 3: Implement the repository**

```typescript
// src/lib/repositories/FeatureFlagRepository.ts
import { db } from '@/lib/database/client'

export interface FlagContext {
  userId: string
  isAdmin: boolean
  isManager: boolean
  isSubscriber: boolean
  subscriberId?: number | null
}

export interface FeatureFlag {
  id: number
  name: string
  description: string | null
  is_enabled: number
  rollout_percentage: number
  environment: string
  created_at: Date | null
  updated_at: Date | null
  overrides: FeatureFlagOverride[]
}

export interface FeatureFlagOverride {
  id: number
  flag_id: number
  context_type: 'user' | 'role' | 'subscriber'
  context_value: string
  is_enabled: number
}

/** Stable 0-99 bucket for a user ID string */
function userBucket(userId: string): number {
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) >>> 0
  }
  return hash % 100
}

export class FeatureFlagRepository {
  /** Evaluate a single flag for a given context. */
  async evaluateFlag(flagName: string, context: FlagContext): Promise<boolean> {
    const flag = await db
      .selectFrom('feature_flags')
      .selectAll()
      .where('name', '=', flagName)
      .executeTakeFirst()

    if (!flag) return false

    // 1. Environment check
    const env = process.env.NODE_ENV ?? 'production'
    if (flag.environment !== 'all' && flag.environment !== env) return false

    // 2. Global kill switch
    if (!flag.is_enabled) return false

    // 3. Load overrides
    const overrides = await db
      .selectFrom('feature_flag_overrides')
      .selectAll()
      .where('flag_id', '=', flag.id)
      .execute()

    // 4. User override
    const userOverride = overrides.find(
      (o) => o.context_type === 'user' && o.context_value === context.userId
    )
    if (userOverride !== undefined) return !!userOverride.is_enabled

    // 5. Role override (admin > manager > subscriber)
    const rolesToCheck: Array<[boolean, string]> = [
      [context.isAdmin, 'admin'],
      [context.isManager, 'manager'],
      [context.isSubscriber, 'subscriber'],
    ]
    for (const [hasRole, roleName] of rolesToCheck) {
      if (!hasRole) continue
      const roleOverride = overrides.find(
        (o) => o.context_type === 'role' && o.context_value === roleName
      )
      if (roleOverride !== undefined) return !!roleOverride.is_enabled
    }

    // 6. Subscriber override
    if (context.subscriberId) {
      const subOverride = overrides.find(
        (o) => o.context_type === 'subscriber' && o.context_value === String(context.subscriberId)
      )
      if (subOverride !== undefined) return !!subOverride.is_enabled
    }

    // 7. Percentage rollout
    return userBucket(context.userId) < flag.rollout_percentage
  }

  async listFlags(): Promise<FeatureFlag[]> {
    const flags = await db
      .selectFrom('feature_flags')
      .selectAll()
      .orderBy('name', 'asc')
      .execute()

    const overrides = await db
      .selectFrom('feature_flag_overrides')
      .selectAll()
      .execute()

    return flags.map((f) => ({
      ...f,
      overrides: overrides.filter((o) => o.flag_id === f.id) as FeatureFlagOverride[],
    }))
  }

  async getFlag(id: number): Promise<FeatureFlag | null> {
    const flag = await db
      .selectFrom('feature_flags')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst()
    if (!flag) return null

    const overrides = await db
      .selectFrom('feature_flag_overrides')
      .selectAll()
      .where('flag_id', '=', id)
      .execute()

    return { ...flag, overrides: overrides as FeatureFlagOverride[] }
  }

  async createFlag(data: {
    name: string
    description?: string
    is_enabled?: boolean
    rollout_percentage?: number
    environment?: string
  }): Promise<number> {
    const result = await db
      .insertInto('feature_flags')
      .values({
        name: data.name,
        description: data.description ?? null,
        is_enabled: data.is_enabled ? 1 : 0,
        rollout_percentage: data.rollout_percentage ?? 0,
        environment: data.environment ?? 'production',
      })
      .executeTakeFirst()
    return Number(result.insertId)
  }

  async updateFlag(id: number, data: {
    is_enabled?: boolean
    rollout_percentage?: number
    environment?: string
    description?: string
  }): Promise<void> {
    const updates: Record<string, unknown> = {}
    if (data.is_enabled !== undefined) updates.is_enabled = data.is_enabled ? 1 : 0
    if (data.rollout_percentage !== undefined) updates.rollout_percentage = data.rollout_percentage
    if (data.environment !== undefined) updates.environment = data.environment
    if (data.description !== undefined) updates.description = data.description

    await db
      .updateTable('feature_flags')
      .set(updates)
      .where('id', '=', id)
      .execute()
  }

  async deleteFlag(id: number): Promise<void> {
    await db.deleteFrom('feature_flags').where('id', '=', id).execute()
  }

  async upsertOverride(flagId: number, data: {
    context_type: 'user' | 'role' | 'subscriber'
    context_value: string
    is_enabled: boolean
  }): Promise<void> {
    // MySQL INSERT ... ON DUPLICATE KEY UPDATE
    await db
      .insertInto('feature_flag_overrides')
      .values({
        flag_id: flagId,
        context_type: data.context_type,
        context_value: data.context_value,
        is_enabled: data.is_enabled ? 1 : 0,
      })
      .onDuplicateKeyUpdate({ is_enabled: data.is_enabled ? 1 : 0 })
      .execute()
  }

  async deleteOverride(overrideId: number): Promise<void> {
    await db.deleteFrom('feature_flag_overrides').where('id', '=', overrideId).execute()
  }
}
```

**Step 4: Run tests to verify they pass**

```bash
bun test src/lib/repositories/__tests__/FeatureFlagRepository.test.ts
```

Expected: All tests PASS.

**Step 5: Commit**

```bash
git add src/lib/repositories/FeatureFlagRepository.ts src/lib/repositories/__tests__/FeatureFlagRepository.test.ts
git commit -m "feat: add FeatureFlagRepository with evaluation logic and tests"
```

---

## Task 3: Update Auth — Add isSuperAdmin to Session

**Files:**
- Modify: `src/lib/auth/config.ts`
- Modify: `src/types/next-auth.d.ts` (or wherever the NextAuth type augmentation lives — search for `declare module 'next-auth'`)

**Step 1: Find the type augmentation file**

```bash
grep -r "declare module 'next-auth'" src/ --include="*.ts" -l
```

**Step 2: Add `isSuperAdmin` to the User and Session types**

In the type augmentation file, add `isSuperAdmin: boolean` to the `User` and `Session['user']` interfaces alongside the existing `isAdmin`, `isManager` fields.

**Step 3: Update `src/lib/auth/config.ts`**

In the `authorize` callback, add alongside the existing employee query:

```typescript
// Inside the employee select array, add:
'employees.is_super_admin',

// In the returned user object, add:
isSuperAdmin: employee?.is_super_admin === 1,
```

In the `jwt` callback, add:
```typescript
token.isSuperAdmin = user.isSuperAdmin
```

In the `session` callback, add:
```typescript
session.user.isSuperAdmin = token.isSuperAdmin as boolean
```

**Step 4: Verify the build compiles**

```bash
bun build 2>&1 | head -30
```

Expected: No TypeScript errors related to `isSuperAdmin`.

**Step 5: Commit**

```bash
git add src/lib/auth/config.ts src/types/
git commit -m "feat: add isSuperAdmin to NextAuth session and JWT"
```

---

## Task 4: Replace Feature Flag Server Utility

**Files:**
- Modify: `src/lib/feature-flags.ts`

**Step 1: Replace the entire file**

```typescript
// src/lib/feature-flags.ts
import { FeatureFlagRepository, FlagContext } from '@/lib/repositories/FeatureFlagRepository'

/**
 * Check a feature flag server-side (for API routes).
 * Pass the full context from session.user for accurate targeting.
 */
export async function isFeatureEnabled(
  flagName: string,
  context: FlagContext | string | undefined
): Promise<boolean> {
  try {
    const repo = new FeatureFlagRepository()

    // Legacy call sites pass a string userId — normalize to FlagContext
    const ctx: FlagContext =
      typeof context === 'string' || context === undefined
        ? {
            userId: context ?? 'anonymous',
            isAdmin: false,
            isManager: false,
            isSubscriber: false,
            subscriberId: null,
          }
        : context

    return await repo.evaluateFlag(flagName, ctx)
  } catch {
    // DB unavailable — fail open in development, closed in production
    return process.env.NODE_ENV === 'development'
  }
}
```

**Step 2: Verify no TypeScript errors**

```bash
bun build 2>&1 | grep -i error | head -20
```

Expected: No errors.

**Step 3: Commit**

```bash
git add src/lib/feature-flags.ts
git commit -m "feat: replace PostHog server flag utility with DB-backed implementation"
```

---

## Task 5: Add Flag Evaluation API Route

**Files:**
- Create: `src/app/api/feature-flags/[name]/route.ts`

**Step 1: Create the route**

```typescript
// src/app/api/feature-flags/[name]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { FeatureFlagRepository } from '@/lib/repositories/FeatureFlagRepository'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params
  const session = await getServerSession(authOptions)

  try {
    const repo = new FeatureFlagRepository()
    const enabled = await repo.evaluateFlag(name, {
      userId: session?.user?.id ?? 'anonymous',
      isAdmin: session?.user?.isAdmin ?? false,
      isManager: session?.user?.isManager ?? false,
      isSubscriber: session?.user?.isSubscriber ?? false,
      subscriberId: session?.user?.subscriberId ?? null,
    })
    return NextResponse.json({ enabled })
  } catch {
    return NextResponse.json({ enabled: false })
  }
}
```

**Step 2: Verify no TypeScript errors**

```bash
bun build 2>&1 | grep -i error | head -20
```

**Step 3: Commit**

```bash
git add src/app/api/feature-flags/
git commit -m "feat: add GET /api/feature-flags/[name] route for client-side evaluation"
```

---

## Task 6: Replace Client-Side useFeatureFlag Hook

**Files:**
- Modify: `src/hooks/useFeatureFlag.ts`

**Step 1: Replace the entire file**

```typescript
// src/hooks/useFeatureFlag.ts
'use client'

import { useEffect, useState } from 'react'

/**
 * Hook to check a feature flag on the client.
 * Returns null while loading, then boolean.
 */
export function useFeatureFlag(flagName: string): boolean | null {
  const [enabled, setEnabled] = useState<boolean | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/feature-flags/${encodeURIComponent(flagName)}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setEnabled(!!data.enabled)
      })
      .catch(() => {
        if (!cancelled) setEnabled(false)
      })
    return () => { cancelled = true }
  }, [flagName])

  return enabled
}
```

**Step 2: Verify build and that existing call sites still compile**

```bash
bun build 2>&1 | grep -i error | head -20
```

**Step 3: Commit**

```bash
git add src/hooks/useFeatureFlag.ts
git commit -m "feat: replace PostHog client hook with DB-backed API fetch"
```

---

## Task 7: Remove PostHog Dependencies

**Files:**
- Modify: `package.json` / `bun.lock`
- Modify: Any PostHog provider wrapper in `src/` (search for `PostHogProvider`)

**Step 1: Find and remove the PostHog provider**

```bash
grep -r "PostHog\|posthog" src/ --include="*.tsx" --include="*.ts" -l
```

For each file found: remove the PostHog import, provider wrapper, and initialization code. The `useFeatureFlag` hook and `isFeatureEnabled` are already replaced — this step removes any remaining `posthog-js` initialization (typically in a layout or providers file).

**Step 2: Uninstall packages**

```bash
bun remove posthog-js posthog-node
```

**Step 3: Verify build**

```bash
bun build 2>&1 | grep -i error | head -20
```

**Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove posthog-js and posthog-node dependencies"
```

---

## Task 8: Admin Feature Flags API Routes

**Files:**
- Create: `src/app/api/admin/feature-flags/route.ts`
- Create: `src/app/api/admin/feature-flags/[id]/route.ts`
- Create: `src/app/api/admin/feature-flags/[id]/overrides/route.ts`

**Step 1: Create the list/create route**

```typescript
// src/app/api/admin/feature-flags/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { FeatureFlagRepository } from '@/lib/repositories/FeatureFlagRepository'

function requireSuperAdmin(session: Awaited<ReturnType<typeof getServerSession>>) {
  if (!session?.user?.isSuperAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  return null
}

export async function GET() {
  const session = await getServerSession(authOptions)
  const denied = requireSuperAdmin(session)
  if (denied) return denied

  const repo = new FeatureFlagRepository()
  const flags = await repo.listFlags()
  return NextResponse.json(flags)
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  const denied = requireSuperAdmin(session)
  if (denied) return denied

  const body = await request.json()
  const { name, description, is_enabled, rollout_percentage, environment } = body

  if (!name || !/^[a-z0-9-]+$/.test(name)) {
    return NextResponse.json({ error: 'Invalid flag name (use lowercase letters, numbers, hyphens)' }, { status: 400 })
  }

  const repo = new FeatureFlagRepository()
  const id = await repo.createFlag({ name, description, is_enabled, rollout_percentage, environment })
  return NextResponse.json({ id }, { status: 201 })
}
```

**Step 2: Create the update/delete route**

```typescript
// src/app/api/admin/feature-flags/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { FeatureFlagRepository } from '@/lib/repositories/FeatureFlagRepository'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.isSuperAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const flagId = parseInt(id)
  if (isNaN(flagId)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

  const body = await request.json()
  const repo = new FeatureFlagRepository()
  await repo.updateFlag(flagId, body)
  const flag = await repo.getFlag(flagId)
  return NextResponse.json(flag)
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.isSuperAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const flagId = parseInt(id)
  if (isNaN(flagId)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

  const repo = new FeatureFlagRepository()
  await repo.deleteFlag(flagId)
  return new NextResponse(null, { status: 204 })
}
```

**Step 3: Create the overrides route**

```typescript
// src/app/api/admin/feature-flags/[id]/overrides/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { FeatureFlagRepository } from '@/lib/repositories/FeatureFlagRepository'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.isSuperAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const flagId = parseInt(id)
  if (isNaN(flagId)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

  const body = await request.json()
  const { context_type, context_value, is_enabled } = body

  if (!['user', 'role', 'subscriber'].includes(context_type) || !context_value) {
    return NextResponse.json({ error: 'Invalid override data' }, { status: 400 })
  }

  const repo = new FeatureFlagRepository()
  await repo.upsertOverride(flagId, { context_type, context_value, is_enabled: !!is_enabled })
  const flag = await repo.getFlag(flagId)
  return NextResponse.json(flag)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.isSuperAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const flagId = parseInt(id)
  const body = await request.json()
  const { override_id } = body

  if (isNaN(flagId) || !override_id) return NextResponse.json({ error: 'Invalid data' }, { status: 400 })

  const repo = new FeatureFlagRepository()
  await repo.deleteOverride(override_id)
  return new NextResponse(null, { status: 204 })
}
```

**Step 4: Verify build**

```bash
bun build 2>&1 | grep -i error | head -20
```

**Step 5: Commit**

```bash
git add src/app/api/admin/feature-flags/
git commit -m "feat: add super-admin feature flag CRUD API routes"
```

---

## Task 9: Admin Feature Flags UI Page

**Files:**
- Create: `src/app/(portal)/admin/feature-flags/page.tsx`

**Step 1: Create the page** (reference design in `docs/redesign.pen` → "Feature Flags" frame)

```typescript
'use client'

import { useEffect, useState } from 'react'
import { Flag, Plus, ChevronDown, ChevronUp, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { logger } from '@/lib/utils/logger'

interface Override {
  id: number
  flag_id: number
  context_type: 'user' | 'role' | 'subscriber'
  context_value: string
  is_enabled: number
}

interface FeatureFlag {
  id: number
  name: string
  description: string | null
  is_enabled: number
  rollout_percentage: number
  environment: string
  overrides: Override[]
}

const ENV_COLORS: Record<string, string> = {
  production: 'bg-blue-50 text-blue-700',
  staging: 'bg-green-50 text-green-700',
  development: 'bg-yellow-50 text-yellow-700',
  all: 'bg-purple-50 text-purple-700',
}

const OVERRIDE_COLORS: Record<string, string> = {
  role: 'bg-green-50 text-green-700',
  user: 'bg-blue-50 text-blue-700',
  subscriber: 'bg-orange-50 text-orange-700',
}

export default function FeatureFlagsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { toast } = useToast()
  const [flags, setFlags] = useState<FeatureFlag[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [showNewDialog, setShowNewDialog] = useState(false)
  const [showOverrideDialog, setShowOverrideDialog] = useState<number | null>(null)

  // New flag form state
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newEnv, setNewEnv] = useState('production')
  const [newPct, setNewPct] = useState(0)
  const [newEnabled, setNewEnabled] = useState(false)

  // New override form state
  const [ovType, setOvType] = useState<'user' | 'role' | 'subscriber'>('role')
  const [ovValue, setOvValue] = useState('')
  const [ovEnabled, setOvEnabled] = useState(true)

  useEffect(() => {
    if (status === 'loading') return
    if (!session?.user?.isSuperAdmin) {
      router.replace('/admin')
      return
    }
    fetchFlags()
  }, [session, status])

  async function fetchFlags() {
    try {
      const res = await fetch('/api/admin/feature-flags')
      if (!res.ok) throw new Error('Failed to load flags')
      setFlags(await res.json())
    } catch (error) {
      logger.error('Error fetching flags:', error)
      toast({ title: 'Error', description: 'Failed to load feature flags', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  async function toggleEnabled(flag: FeatureFlag) {
    try {
      await fetch(`/api/admin/feature-flags/${flag.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_enabled: !flag.is_enabled }),
      })
      setFlags((prev) => prev.map((f) => f.id === flag.id ? { ...f, is_enabled: flag.is_enabled ? 0 : 1 } : f))
    } catch (error) {
      logger.error('Error toggling flag:', error)
      toast({ title: 'Error', description: 'Failed to update flag', variant: 'destructive' })
    }
  }

  async function saveEdit(flag: FeatureFlag, patch: Partial<FeatureFlag>) {
    try {
      const res = await fetch(`/api/admin/feature-flags/${flag.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      const updated = await res.json()
      setFlags((prev) => prev.map((f) => f.id === flag.id ? updated : f))
      toast({ title: 'Saved' })
    } catch (error) {
      logger.error('Error saving flag:', error)
      toast({ title: 'Error', description: 'Failed to save', variant: 'destructive' })
    }
  }

  async function createFlag() {
    try {
      const res = await fetch('/api/admin/feature-flags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, description: newDesc, is_enabled: newEnabled, rollout_percentage: newPct, environment: newEnv }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error)
      }
      setShowNewDialog(false)
      setNewName(''); setNewDesc(''); setNewEnv('production'); setNewPct(0); setNewEnabled(false)
      await fetchFlags()
      toast({ title: 'Flag created' })
    } catch (error) {
      logger.error('Error creating flag:', error)
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Failed to create flag', variant: 'destructive' })
    }
  }

  async function addOverride(flagId: number) {
    try {
      const res = await fetch(`/api/admin/feature-flags/${flagId}/overrides`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context_type: ovType, context_value: ovValue, is_enabled: ovEnabled }),
      })
      const updated = await res.json()
      setFlags((prev) => prev.map((f) => f.id === flagId ? updated : f))
      setShowOverrideDialog(null)
      setOvValue('')
      toast({ title: 'Override added' })
    } catch (error) {
      logger.error('Error adding override:', error)
      toast({ title: 'Error', description: 'Failed to add override', variant: 'destructive' })
    }
  }

  async function deleteOverride(flagId: number, overrideId: number) {
    try {
      await fetch(`/api/admin/feature-flags/${flagId}/overrides`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ override_id: overrideId }),
      })
      setFlags((prev) => prev.map((f) =>
        f.id === flagId ? { ...f, overrides: f.overrides.filter((o) => o.id !== overrideId) } : f
      ))
    } catch (error) {
      logger.error('Error deleting override:', error)
      toast({ title: 'Error', description: 'Failed to delete override', variant: 'destructive' })
    }
  }

  if (loading) return <div className="container mx-auto py-10"><p className="text-muted-foreground">Loading...</p></div>

  return (
    <div className="container mx-auto py-10">
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-bold">Feature Flags</h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
              Super Admin
            </span>
          </div>
          <p className="text-muted-foreground">Control feature rollouts by environment, role, tenant, and percentage</p>
        </div>
        <Button onClick={() => setShowNewDialog(true)}>
          <Plus className="h-4 w-4 mr-2" /> New Flag
        </Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[220px]">Flag Name</TableHead>
              <TableHead className="w-[120px]">Environment</TableHead>
              <TableHead className="w-[200px]">Rollout</TableHead>
              <TableHead className="w-[160px]">Overrides</TableHead>
              <TableHead className="w-[80px]">Enabled</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {flags.map((flag) => (
              <>
                <TableRow key={flag.id}>
                  <TableCell>
                    <p className="font-mono text-sm font-medium">{flag.name}</p>
                    {flag.description && <p className="text-xs text-muted-foreground mt-0.5">{flag.description}</p>}
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ENV_COLORS[flag.environment] ?? 'bg-stone-100 text-stone-600'}`}>
                      {flag.environment}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${flag.rollout_percentage}%` }} />
                      </div>
                      <span className="text-xs text-muted-foreground">{flag.rollout_percentage}% of users</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {flag.overrides.slice(0, 2).map((o) => (
                        <span key={o.id} className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${OVERRIDE_COLORS[o.context_type]}`}>
                          {o.context_type}
                        </span>
                      ))}
                      {flag.overrides.length > 2 && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-sky-50 text-sky-700">
                          +{flag.overrides.length - 2}
                        </span>
                      )}
                      {flag.overrides.length === 0 && <span className="text-muted-foreground text-sm">—</span>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={!!flag.is_enabled}
                      onCheckedChange={() => toggleEnabled(flag)}
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setExpandedId(expandedId === flag.id ? null : flag.id)}
                    >
                      {expandedId === flag.id ? <ChevronUp className="h-3 w-3 mr-1" /> : <ChevronDown className="h-3 w-3 mr-1" />}
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>

                {expandedId === flag.id && (
                  <TableRow key={`${flag.id}-edit`} className="bg-muted/30">
                    <TableCell colSpan={6} className="p-6">
                      <div className="border-2 border-primary/30 rounded-lg p-5 bg-card space-y-5">
                        <h3 className="font-semibold text-sm">Editing: <span className="font-mono">{flag.name}</span></h3>

                        <div className="grid grid-cols-2 gap-6">
                          <div className="space-y-4">
                            <div>
                              <Label className="text-xs text-muted-foreground mb-1 block">Environment</Label>
                              <Select
                                defaultValue={flag.environment}
                                onValueChange={(v) => saveEdit(flag, { environment: v })}
                              >
                                <SelectTrigger className="h-8 text-sm">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {['production', 'staging', 'development', 'all'].map((e) => (
                                    <SelectItem key={e} value={e}>{e}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <Label className="text-xs text-muted-foreground">Rollout Percentage</Label>
                                <span className="font-mono text-sm font-semibold text-primary">{flag.rollout_percentage}%</span>
                              </div>
                              <input
                                type="range"
                                min={0}
                                max={100}
                                defaultValue={flag.rollout_percentage}
                                className="w-full accent-primary"
                                onMouseUp={(e) => saveEdit(flag, { rollout_percentage: Number((e.target as HTMLInputElement).value) })}
                              />
                            </div>
                          </div>

                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <Label className="text-xs text-muted-foreground">Overrides</Label>
                              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setShowOverrideDialog(flag.id)}>
                                <Plus className="h-3 w-3 mr-1" /> Add Override
                              </Button>
                            </div>
                            {flag.overrides.map((o) => (
                              <div key={o.id} className="flex items-center gap-2 bg-muted rounded-md px-3 py-2">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${OVERRIDE_COLORS[o.context_type]}`}>
                                  {o.context_type}
                                </span>
                                <span className="font-mono text-xs flex-1 truncate">{o.context_value}</span>
                                <Switch checked={!!o.is_enabled} onCheckedChange={async (v) => {
                                  await fetch(`/api/admin/feature-flags/${flag.id}/overrides`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ context_type: o.context_type, context_value: o.context_value, is_enabled: v }),
                                  })
                                  setFlags((prev) => prev.map((f) =>
                                    f.id === flag.id
                                      ? { ...f, overrides: f.overrides.map((ov) => ov.id === o.id ? { ...ov, is_enabled: v ? 1 : 0 } : ov) }
                                      : f
                                  ))
                                }} />
                                <button onClick={() => deleteOverride(flag.id, o.id)} className="text-destructive hover:opacity-70">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            ))}
                            {flag.overrides.length === 0 && (
                              <p className="text-xs text-muted-foreground italic">No overrides — rollout percentage applies to all users</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </>
            ))}
            {flags.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                  No feature flags yet. Create your first one.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* New Flag Dialog */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Feature Flag</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Name <span className="text-muted-foreground text-xs">(lowercase, hyphens only)</span></Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="enable-my-feature" className="mt-1" />
            </div>
            <div>
              <Label>Description</Label>
              <Input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="What does this flag control?" className="mt-1" />
            </div>
            <div>
              <Label>Environment</Label>
              <Select value={newEnv} onValueChange={setNewEnv}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['production', 'staging', 'development', 'all'].map((e) => (
                    <SelectItem key={e} value={e}>{e}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <Label>Rollout Percentage</Label>
                <span className="font-mono text-sm text-primary">{newPct}%</span>
              </div>
              <input type="range" min={0} max={100} value={newPct} onChange={(e) => setNewPct(Number(e.target.value))} className="w-full accent-primary" />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={newEnabled} onCheckedChange={setNewEnabled} />
              <Label>Enabled immediately</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewDialog(false)}>Cancel</Button>
            <Button onClick={createFlag} disabled={!newName}>Create Flag</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Override Dialog */}
      <Dialog open={showOverrideDialog !== null} onOpenChange={(o) => !o && setShowOverrideDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Override</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Type</Label>
              <Select value={ovType} onValueChange={(v) => setOvType(v as 'user' | 'role' | 'subscriber')}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="role">Role (admin / manager / subscriber)</SelectItem>
                  <SelectItem value="user">User ID</SelectItem>
                  <SelectItem value="subscriber">Subscriber ID</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Value</Label>
              <Input value={ovValue} onChange={(e) => setOvValue(e.target.value)} placeholder={ovType === 'role' ? 'admin' : ovType === 'user' ? 'user ID' : 'subscriber ID'} className="mt-1" />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={ovEnabled} onCheckedChange={setOvEnabled} />
              <Label>Enabled for this override</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOverrideDialog(null)}>Cancel</Button>
            <Button onClick={() => addOverride(showOverrideDialog!)} disabled={!ovValue}>Add Override</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
```

**Step 2: Verify build**

```bash
bun build 2>&1 | grep -i error | head -20
```

**Step 3: Commit**

```bash
git add src/app/\(portal\)/admin/feature-flags/
git commit -m "feat: add super-admin feature flags management UI"
```

---

## Task 10: Update Admin Sidebar

**Files:**
- Modify: `src/components/admin/AdminSidebar.tsx`

**Step 1: Add the Flag icon import and nav item**

Add `Flag` to the lucide-react import line.

Add to `adminNavItems` array:
```typescript
{
  href: '/admin/feature-flags',
  icon: Flag,
  label: 'Feature Flags',
  description: 'Manage feature rollouts',
  superAdminOnly: true,
},
```

**Step 2: Add the `useSession` hook and filter logic**

Import `useSession` from `next-auth/react` at the top.

Add inside the component:
```typescript
const { data: session } = useSession()
```

Update `visibleNavItems` to also filter by `superAdminOnly`:
```typescript
const visibleNavItems = useMemo(
  () => adminNavItems.filter((item) => {
    if (item.featureFlag && subscriptionsEnabled !== true) return false
    if (item.superAdminOnly && !session?.user?.isSuperAdmin) return false
    return true
  }),
  [subscriptionsEnabled, session]
)
```

**Step 3: Verify build**

```bash
bun build 2>&1 | grep -i error | head -20
```

**Step 4: Commit**

```bash
git add src/components/admin/AdminSidebar.tsx
git commit -m "feat: add Feature Flags nav item (super admin only) to sidebar"
```

---

## Task 11: Update Call Sites in API Routes (Context Object)

**Files:**
- Modify: All files matching `grep -r "isFeatureEnabled" src/app/api --include="*.ts" -l`

The existing call sites pass a `string` userId (e.g., `isFeatureEnabled('enable-subscriptions', session.user.id)`). The updated `isFeatureEnabled` still accepts a plain string for backwards compatibility, but API routes that have full session context should pass it for accurate targeting.

**Step 1: For each API route that calls `isFeatureEnabled`, update to pass full context:**

Replace:
```typescript
if (!await isFeatureEnabled('enable-subscriptions', session.user.id)) {
```

With:
```typescript
if (!await isFeatureEnabled('enable-subscriptions', {
  userId: session.user.id,
  isAdmin: session.user.isAdmin,
  isManager: session.user.isManager ?? false,
  isSubscriber: session.user.isSubscriber ?? false,
  subscriberId: session.user.subscriberId ?? null,
})) {
```

**Step 2: Verify build**

```bash
bun build 2>&1 | grep -i error | head -20
```

**Step 3: Run all tests**

```bash
bun test
```

Expected: All tests pass.

**Step 4: Commit**

```bash
git add src/app/api/
git commit -m "feat: pass full session context to isFeatureEnabled in API routes"
```

---

## Task 12: Set Your Account as Super Admin

**Step 1: In your local DB, set `is_super_admin = 1` for your employee record**

```sql
UPDATE employees SET is_super_admin = 1 WHERE email = 'your-email@choicemktg.com';
```

**Step 2: Sign out and back in** (NextAuth JWT must refresh to pick up the new column value)

**Step 3: Verify you can see "Feature Flags" in the sidebar and access `/admin/feature-flags`**

**Step 4: Final build and test run**

```bash
bun build && bun test
```

Expected: Clean build, all tests pass.

**Step 5: Final commit**

```bash
git add -A
git commit -m "feat: complete custom feature flag system - replace PostHog"
```

---

## Verification Checklist

- [ ] `bun build` — no TypeScript errors
- [ ] `bun test` — all tests pass
- [ ] Sign in as super admin → see "Feature Flags" in sidebar
- [ ] `/admin/feature-flags` loads flag list
- [ ] Can create a new flag, toggle enabled, change percentage, change environment
- [ ] Can add a role override (e.g., `admin`, enabled) and verify admin users get the flag
- [ ] Can add a user override for a specific user ID
- [ ] Sign in as non-super-admin → "Feature Flags" nav item not visible
- [ ] `enable-subscriptions` flag still controls billing UI (existing behavior preserved)
- [ ] PostHog errors are gone from the browser console
