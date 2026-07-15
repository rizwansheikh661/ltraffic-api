-- 002 — lt_refresh_tokens
-- Stores refresh-token hashes (never plaintext). One row per active session
-- per device. Rotated on every use (old row revoked, new row inserted).

CREATE TABLE IF NOT EXISTS `lt_refresh_tokens` (
  `id`          BIGINT       NOT NULL AUTO_INCREMENT,
  `user_id`     INT(8)       NOT NULL,
  `token_hash`  CHAR(64)     NOT NULL COMMENT 'sha256 hex of the opaque refresh token',
  `device_id`   VARCHAR(128) NULL DEFAULT NULL,
  `user_agent`  VARCHAR(255) NULL DEFAULT NULL,
  `ip`          VARCHAR(45)  NULL DEFAULT NULL,
  `expires_at`  DATETIME     NOT NULL,
  `revoked_at`  DATETIME     NULL DEFAULT NULL,
  `created_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ux_token_hash` (`token_hash`),
  KEY `ix_user_active` (`user_id`, `revoked_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
