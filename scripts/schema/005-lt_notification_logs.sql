-- 005 — lt_notification_logs
-- Per-attempt FCM send log. Separate from lt_notifications (business inbox)
-- because a single notification can produce N send attempts across devices.

CREATE TABLE IF NOT EXISTS `lt_notification_logs` (
  `id`              BIGINT       NOT NULL AUTO_INCREMENT,
  `notification_id` BIGINT       NULL DEFAULT NULL,
  `user_id`         INT(8)       NOT NULL,
  `device_token_id` BIGINT       NULL DEFAULT NULL,
  `provider`        VARCHAR(32)  NOT NULL DEFAULT 'fcm',
  `status`          ENUM('queued','sent','failed','skipped') NOT NULL,
  `provider_msg_id` VARCHAR(255) NULL DEFAULT NULL,
  `error_code`      VARCHAR(64)  NULL DEFAULT NULL,
  `error_message`   TEXT         NULL,
  `created_at`      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `ix_notification` (`notification_id`),
  KEY `ix_user_status` (`user_id`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
