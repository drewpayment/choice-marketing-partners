-- Seed marketing data for website services page
-- Run AFTER products and prices exist in the database
-- This maps existing products to marketing presentation
-- NOTE: Adjust product_id values to match your actual products table entries

-- Tiers
INSERT INTO product_marketing (product_id, category, tagline, feature_list, display_order, is_featured, badge_text)
VALUES
  (1, 'tier', 'Perfect for getting started with a professional online presence.',
   '["1 page", "Lead capture form", "Mobile responsive", "Email support"]',
   1, 0, NULL),
  (2, 'tier', 'The complete package for growing your brand and capturing leads.',
   '["Up to 5 pages", "3 custom features", "Basic CMS", "CRM integration", "Priority support"]',
   2, 1, 'MOST POPULAR'),
  (3, 'tier', 'Full-featured applications with dashboards, analytics, and integrations.',
   '["Up to 15 pages", "8 custom features", "Advanced CMS", "Analytics dashboard", "Dedicated support"]',
   3, 0, NULL),
  (4, 'tier', 'White-glove service with unlimited features and a dedicated account manager.',
   '["Unlimited pages", "Unlimited features", "Custom CMS + integrations", "Full analytics suite", "Dedicated account manager"]',
   4, 0, NULL)
ON DUPLICATE KEY UPDATE
  category = VALUES(category),
  tagline = VALUES(tagline),
  feature_list = VALUES(feature_list),
  display_order = VALUES(display_order),
  is_featured = VALUES(is_featured),
  badge_text = VALUES(badge_text);

-- Add-ons (adjust product_ids to match your actual addon products)
INSERT INTO product_marketing (product_id, category, tagline, feature_list, display_order, is_featured, icon_name)
VALUES
  (5, 'addon', NULL, '[]', 10, 0, 'shopping-cart'),
  (6, 'addon', NULL, '[]', 11, 0, 'search'),
  (7, 'addon', NULL, '[]', 12, 0, 'palette'),
  (8, 'addon', NULL, '[]', 13, 0, 'wallet'),
  (9, 'addon', NULL, '[]', 14, 0, 'trending-up'),
  (10, 'addon', NULL, '[]', 15, 0, 'share-2')
ON DUPLICATE KEY UPDATE
  category = VALUES(category),
  icon_name = VALUES(icon_name),
  display_order = VALUES(display_order);
