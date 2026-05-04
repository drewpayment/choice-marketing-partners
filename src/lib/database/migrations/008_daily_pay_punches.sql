-- 008_daily_pay_punches.sql
-- Daily-rate punch tracking: enrollments, punch records, pay records, and runtime cutoff settings.

-- ── Singleton settings row for the auto-reject cutoff cron ──
CREATE TABLE IF NOT EXISTS daily_pay_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  is_auto_cutoff_enabled TINYINT(1) NOT NULL DEFAULT 1,
  cutoff_day_of_week TINYINT NOT NULL DEFAULT 5,
  cutoff_time_local VARCHAR(8) NOT NULL DEFAULT '23:59:00',
  cutoff_timezone VARCHAR(64) NOT NULL DEFAULT 'America/Detroit',
  updated_by INT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT INTO daily_pay_settings (id, is_auto_cutoff_enabled, cutoff_day_of_week, cutoff_time_local, cutoff_timezone)
SELECT 1, 1, 5, '23:59:00', 'America/Detroit'
WHERE NOT EXISTS (SELECT 1 FROM daily_pay_settings);

-- ── Per-(employee, vendor) enrollment with a per-row daily rate ──
CREATE TABLE IF NOT EXISTS daily_pay_enrollments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT NOT NULL,
  vendor_id INT NOT NULL,
  daily_rate DECIMAL(10,2) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_by INT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_daily_pay_enrollment (employee_id, vendor_id),
  INDEX idx_daily_pay_enrollment_employee (employee_id, is_active),
  INDEX idx_daily_pay_enrollment_vendor (vendor_id, is_active)
);

-- ── Each punch attempt with location + status ──
CREATE TABLE IF NOT EXISTS daily_punch_records (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT NOT NULL,
  vendor_id INT NOT NULL,
  punched_at DATETIME NOT NULL,
  work_date DATE NOT NULL,
  latitude DECIMAL(9,6) NULL,
  longitude DECIMAL(9,6) NULL,
  accuracy_meters INT NULL,
  status ENUM('pending','approved','declined','auto_rejected') NOT NULL DEFAULT 'pending',
  decided_by INT NULL,
  decided_at TIMESTAMP NULL,
  decline_reason TEXT NULL,
  ip_address VARCHAR(45) NULL,
  user_agent TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_daily_punch_status_date (status, work_date),
  INDEX idx_daily_punch_employee_date (employee_id, work_date),
  INDEX idx_daily_punch_vendor_date (vendor_id, work_date)
);

-- ── The pay line items, FK back to the punch ──
CREATE TABLE IF NOT EXISTS daily_pay_records (
  id INT AUTO_INCREMENT PRIMARY KEY,
  punch_id INT NOT NULL,
  employee_id INT NOT NULL,
  vendor_id INT NOT NULL,
  work_date DATE NOT NULL,
  wkending DATE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  description VARCHAR(255) NOT NULL DEFAULT 'Daily incentive',
  created_by INT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reversed_at TIMESTAMP NULL,
  reversed_by INT NULL,
  UNIQUE KEY uk_daily_pay_record_punch (punch_id),
  INDEX idx_daily_pay_record_paystub (employee_id, vendor_id, wkending, reversed_at),
  CONSTRAINT fk_daily_pay_record_punch FOREIGN KEY (punch_id) REFERENCES daily_punch_records(id)
);
