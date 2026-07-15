-- 004 — lt_notifications
-- Per-user notification inbox. Feeds the mobile in-app notifications screen.

CREATE TABLE IF NOT EXISTS `lt_notifications` (
  `id`         BIGINT       NOT NULL AUTO_INCREMENT,
  `user_id`    INT(8)       NOT NULL,
  `type`       VARCHAR(64)  NOT NULL COMMENT 'e.g. BULLETIN_PUBLISHED, TIMESHEET_APPROVED',
  `title`      VARCHAR(255) NOT NULL,
  `body`       TEXT         NULL,
  `data_json`  JSON         NULL,
  `sent_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `read_at`    DATETIME     NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_user_read` (`user_id`, `read_at`),
  KEY `ix_type` (`type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
