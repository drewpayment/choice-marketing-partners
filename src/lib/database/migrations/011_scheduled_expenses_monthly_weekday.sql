-- 011_scheduled_expenses_monthly_weekday.sql
-- Add "nth weekday of the month" recurrence to recurring expense templates
-- (e.g. "first Monday of the month", "last Friday of the month").
--
-- Two new nullable columns, only populated when frequency = 'monthly_weekday':
--   monthly_week    1=first, 2=second, 3=third, 4=fourth, 5=last
--   monthly_weekday 0=Sunday … 6=Saturday (matches JS Date.getDay() / dayjs .day())
-- For every other frequency both columns are stored as NULL (enforced in repo layer).

ALTER TABLE scheduled_expenses
  ADD COLUMN monthly_week TINYINT NULL AFTER frequency,
  ADD COLUMN monthly_weekday TINYINT NULL AFTER monthly_week;
