-- Subscribers table
CREATE TABLE subscribers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  stripe_customer_id VARCHAR(255) UNIQUE,
  business_name VARCHAR(255) NULL,
  phone VARCHAR(50) NULL,
  address VARCHAR(255) NULL,
  city VARCHAR(100) NULL,
  state VARCHAR(50) NULL,
  postal_code VARCHAR(20) NULL,
  status ENUM('active', 'past_due', 'canceled', 'paused') NOT NULL DEFAULT 'active',
  notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Subscriber-User junction
CREATE TABLE subscriber_user (
  subscriber_id INT NOT NULL,
  user_id INT NOT NULL,
  PRIMARY KEY (subscriber_id, user_id),
  FOREIGN KEY (subscriber_id) REFERENCES subscribers(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Products catalog
CREATE TABLE products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  stripe_product_id VARCHAR(255) UNIQUE,
  name VARCHAR(255) NOT NULL,
  description TEXT NULL,
  type ENUM('recurring', 'one_time', 'custom') NOT NULL DEFAULT 'recurring',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Prices linked to products
CREATE TABLE prices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  stripe_price_id VARCHAR(255) UNIQUE,
  amount_cents INT NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'usd',
  `interval` ENUM('month', 'quarter', 'year', 'one_time') NOT NULL DEFAULT 'month',
  interval_count INT NOT NULL DEFAULT 1,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Subscriber subscriptions (cache of Stripe)
CREATE TABLE subscriber_subscriptions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  subscriber_id INT NOT NULL,
  stripe_subscription_id VARCHAR(255) UNIQUE,
  product_id INT NOT NULL,
  price_id INT NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'incomplete',
  current_period_start DATETIME NULL,
  current_period_end DATETIME NULL,
  cancel_at_period_end TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (subscriber_id) REFERENCES subscribers(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id),
  FOREIGN KEY (price_id) REFERENCES prices(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Payment history (append-only, webhook-populated)
CREATE TABLE payment_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  subscriber_id INT NOT NULL,
  stripe_invoice_id VARCHAR(255) UNIQUE,
  stripe_payment_intent_id VARCHAR(255) NULL,
  amount_cents INT NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'usd',
  status VARCHAR(50) NOT NULL,
  description VARCHAR(255) NULL,
  invoice_pdf_url TEXT NULL,
  paid_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (subscriber_id) REFERENCES subscribers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
