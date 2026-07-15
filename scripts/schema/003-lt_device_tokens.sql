-- 003 — lt_device_tokens
-- FCM device tokens registered per user + platform. A user can have multiple
-- devices; a token can move users on re-login (unique on token, not on user).

CREATE TABLE IF NOT EXISTS `lt_device_tokens` (
  `id`           BIGINT       NOT NULL AUTO_INCREMENT,
  `user_id`      INT(8)       NOT NULL,
  `token`        VARCHAR(512) NOT NULL,
  `platform`     ENUM('ios','android') NOT NULL,
  `app_version`  VARCHAR(32)  NULL DEFAULT NULL,
  `created_at`   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `last_seen_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `revoked_at`   DATETIME     NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ux_token` (`token`(191)),
  KEY `ix_user_active` (`user_id`, `revoked_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
