-- 009 — Admin-managed content for the My Account legal/information pages.
CREATE TABLE IF NOT EXISTS `lt_content_pages` (
  `slug`       VARCHAR(64)  NOT NULL,
  `title`      VARCHAR(255) NOT NULL,
  `content`    LONGTEXT     NOT NULL,
  `updated_by` INT(8)       NULL,
  `updated_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `lt_content_pages` (`slug`, `title`, `content`)
VALUES
  ('about-us', 'About Us', ''),
  ('privacy-policy', 'Privacy Policy', ''),
  ('terms-and-conditions', 'Terms & Conditions', '')
ON DUPLICATE KEY UPDATE `slug` = VALUES(`slug`);
