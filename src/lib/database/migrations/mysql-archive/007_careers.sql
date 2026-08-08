-- 007_careers.sql
-- Careers feature: public job postings + applications inbox.

CREATE TABLE IF NOT EXISTS job_postings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(120) NOT NULL,
  title VARCHAR(160) NOT NULL,
  department ENUM('sales','operations','engineering','marketing','admin','other') NOT NULL,
  status ENUM('draft','active','filled','closed') NOT NULL DEFAULT 'draft',
  employment_type ENUM('full-time','part-time','contract','seasonal') NOT NULL,
  work_setting ENUM('remote','hybrid','in-person') NOT NULL,

  location_city VARCHAR(120) DEFAULT NULL,
  location_state VARCHAR(60) DEFAULT NULL,

  salary_min DECIMAL(10,2) DEFAULT NULL,
  salary_max DECIMAL(10,2) DEFAULT NULL,
  salary_type ENUM('hourly','annual') DEFAULT NULL,
  salary_show_as ENUM('range','starting-at','up-to','exact','hidden') NOT NULL DEFAULT 'range',

  summary VARCHAR(500) DEFAULT NULL,
  description LONGTEXT NOT NULL,
  responsibilities LONGTEXT NOT NULL,
  qualifications LONGTEXT NOT NULL,
  benefits LONGTEXT DEFAULT NULL,

  apply_url VARCHAR(500) DEFAULT NULL,

  posted_at DATETIME DEFAULT NULL,
  created_by INT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME DEFAULT NULL,

  UNIQUE KEY uk_job_postings_slug (slug),
  INDEX idx_job_postings_status_posted (status, posted_at),
  INDEX idx_job_postings_department (department),
  INDEX idx_job_postings_deleted_at (deleted_at)
);

CREATE TABLE IF NOT EXISTS job_applications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  job_posting_id INT NOT NULL,

  applicant_name VARCHAR(160) NOT NULL,
  applicant_email VARCHAR(160) NOT NULL,
  applicant_phone VARCHAR(40) DEFAULT NULL,
  cover_letter TEXT DEFAULT NULL,
  resume_url VARCHAR(500) DEFAULT NULL,
  resume_filename VARCHAR(200) DEFAULT NULL,

  status ENUM('new','reviewing','contacted','rejected','hired') NOT NULL DEFAULT 'new',
  notes TEXT DEFAULT NULL,

  submitted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_job_applications_job_status (job_posting_id, status),
  INDEX idx_job_applications_email (applicant_email),
  INDEX idx_job_applications_submitted_at (submitted_at),

  CONSTRAINT fk_job_applications_posting
    FOREIGN KEY (job_posting_id) REFERENCES job_postings(id)
    ON DELETE RESTRICT ON UPDATE CASCADE
);
