-- 006 — lt_audit_logs
-- Append-only audit trail for business actions.
-- `before_json`/`after_json` are the row snapshots pre/post-write.

CREATE TABLE IF NOT EXISTS `lt_audit_logs` (
  `id`          BIGINT       NOT NULL AUTO_INCREMENT,
  `user_id`     INT(8)       NULL DEFAULT NULL,
  `action`      VARCHAR(64)  NOT NULL COMMENT 'e.g. auth.login, timesheet.approve',
  `entity`      VARCHAR(64)  NOT NULL COMMENT 'e.g. timesheet, healthsafety',
  `entity_id`   VARCHAR(64)  NULL DEFAULT NULL,
  `before_json` JSON         NULL,
  `after_json`  JSON         NULL,
  `request_id`  VARCHAR(64)  NULL DEFAULT NULL,
  `ip`          VARCHAR(45)  NULL DEFAULT NULL,
  `user_agent`  VARCHAR(255) NULL DEFAULT NULL,
  `created_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `ix_entity` (`entity`, `entity_id`),
  KEY `ix_user_action` (`user_id`, `action`),
  KEY `ix_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
