/**
 * One-off seed: insert a realistic sample job posting via JobPostingRepository,
 * so the careers surface has something to look at during review.
 *
 * Run with: bun run scripts/seed-careers-sample.ts
 *
 * Safe to re-run: skips if the slug already exists.
 */

import { JobPostingRepository } from '../src/lib/repositories/JobPostingRepository'
import { db } from '../src/lib/database/client'
import type { UserContext } from '../src/lib/auth/types'

async function main() {
  const repo = new JobPostingRepository()

  const slug = 'field-sales-representative-energy'

  if (await repo.slugExists(slug)) {
    console.log(`Slug "${slug}" already exists — skipping insert.`)
    await db.destroy()
    return
  }

  // Find the first admin employee to use as `created_by`.
  const admin = await db
    .selectFrom('employees')
    .select(['id'])
    .where('is_admin', '=', 1)
    .where('deleted_at', 'is', null)
    .executeTakeFirst()

  if (!admin) {
    throw new Error(
      'No admin employee found. Seed an admin first (scripts/seed-test-accounts.ts).',
    )
  }

  const ctx: UserContext = {
    isAdmin: true,
    isManager: false,
    employeeId: admin.id,
  }

  const created = await repo.create(
    {
      slug,
      title: 'Field Sales Representative — Energy',
      department: 'sales',
      status: 'active',
      employment_type: 'full-time',
      work_setting: 'in-person',
      location_city: 'Chicago',
      location_state: 'IL',
      salary_min: '55000',
      salary_max: '120000',
      salary_type: 'annual',
      salary_show_as: 'range',
      summary:
        'Sell residential energy supply contracts on behalf of our partner utilities. ' +
        'Base + uncapped commission + weekly contests.',
      description: `
<p>Choice Marketing Partners is hiring a Field Sales Representative to grow our residential energy book in the greater Chicago area. You'll work face-to-face with homeowners and small businesses, walking them through their utility bill and signing them up for one of our partner suppliers (Santanna, Continuum, Palmco).</p>
<p>This is a high-energy role for someone who likes being out of an office, hitting numbers, and getting paid for it. You'll have a manager riding with you for your first two weeks and ongoing leaderboard recognition for top performers.</p>
`.trim(),
      responsibilities: `
<ul>
  <li>Run a daily door-to-door route in assigned territories, hitting 60–100 doors per day.</li>
  <li>Educate prospects on their current rate vs. our partner's offering and complete enrollment paperwork on tablet.</li>
  <li>Hit a weekly minimum of 12 verified contracts; top reps land 25+.</li>
  <li>Submit clean enrollments — no chargebacks, no rewrites — and respond to QA callbacks within 24 hours.</li>
  <li>Show up to morning huddle and end-of-week wrap meetings on time, every time.</li>
</ul>
`.trim(),
      qualifications: `
<ul>
  <li>You're 18+, have reliable transportation, and can pass a background check.</li>
  <li>You're comfortable knocking on a stranger's door and starting a conversation — prior D2D, retail, restaurant, or commission sales is a plus but not required.</li>
  <li>You can read a utility bill (we'll teach you) and explain savings without overpromising.</li>
  <li>You're competitive. You like the leaderboard. You don't fold when the first three doors say no.</li>
  <li>Spanish fluency is a bonus and earns a rate premium in select territories.</li>
</ul>
`.trim(),
      benefits: `
<ul>
  <li><strong>Base + uncapped commission:</strong> $55k–$120k OTE for an average performer; top reps clear $150k.</li>
  <li><strong>Weekly Comma Club:</strong> $500–$4,000 cash bonuses for hitting weekly milestones.</li>
  <li><strong>Big-ticket contests:</strong> all-expense-paid trips, vehicle giveaways, and our annual house-down-payment grand prize.</li>
  <li><strong>Health, dental, vision</strong> after 60 days; 401(k) match after one year.</li>
  <li><strong>Real promotion path:</strong> our managers and directors all came up from the field. Hit your numbers and you'll know exactly when you're up for a promotion.</li>
</ul>
`.trim(),
      apply_url: null, // Use internal application form
    },
    ctx,
  )

  console.log(`Created job posting #${created.id}: ${created.title}`)
  console.log(`  Public:  http://localhost:3000/careers/${created.slug}`)
  console.log(`  Apply:   http://localhost:3000/careers/${created.slug}/apply`)
  console.log(`  Admin:   http://localhost:3000/admin/careers/${created.id}/edit`)

  await db.destroy()
}

main().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
