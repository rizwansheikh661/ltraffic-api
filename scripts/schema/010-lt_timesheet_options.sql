-- 010 — Admin-managed Activity and Contract values for the timesheet form.
-- Options are deactivated instead of removed so existing submitted timesheets
-- always retain their historical text values.
CREATE TABLE IF NOT EXISTS `lt_timesheet_options` (
  `id`         BIGINT       NOT NULL AUTO_INCREMENT,
  `type`       ENUM('activity', 'contract') NOT NULL,
  `name`       VARCHAR(255) NOT NULL,
  `is_active`  TINYINT(1)   NOT NULL DEFAULT 1,
  `sort_order` INT          NOT NULL DEFAULT 0,
  `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_lt_timesheet_option_type_name` (`type`, `name`),
  KEY `ix_lt_timesheet_options_active` (`type`, `is_active`, `sort_order`, `name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
