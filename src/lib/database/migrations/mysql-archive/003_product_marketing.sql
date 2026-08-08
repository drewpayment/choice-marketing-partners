-- Product marketing metadata (idempotent — safe to run multiple times)

CREATE TABLE IF NOT EXISTS product_marketing (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  category ENUM('tier', 'addon') NOT NULL DEFAULT 'tier',
  tagline VARCHAR(255) NULL,
  feature_list JSON NULL,
  display_order INT NOT NULL DEFAULT 0,
  is_featured TINYINT(1) NOT NULL DEFAULT 0,
  icon_name VARCHAR(100) NULL,
  badge_text VARCHAR(50) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  UNIQUE KEY uq_product_marketing (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
