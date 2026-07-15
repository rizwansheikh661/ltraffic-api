-- 007-auth-hardening.sql
-- Auth production-readiness hardening — index additions and one redundant index drop.
--
-- Applied fixes (approved in docs/audit/11-auth-production-readiness-review.md):
--   PERF-01: ADD INDEX ix_email ON login_users(email)
--   PERF-03: ADD INDEX ix_key_type ON login_confirm(`key`, type)
--   PERF-04: DROP redundant UNIQUE KEY `user_id` ON login_users (duplicates PRIMARY)
--   PERF-05: ADD INDEX ix_user_ts ON login_timestamps(user_id, timestamp)
--   PERF-06: ADD INDEX ix_expires ON lt_refresh_tokens(expires_at)
--
-- All operations are non-destructive (index metadata only; no data changes).
-- MariaDB InnoDB uses online DDL where possible — brief metadata locks only.
--
-- Verified before/after with EXPLAIN. See docs/audit/13-performance-review-report.md.

-- Guards: each ALTER is wrapped so re-running is idempotent.

-- PERF-01 · Index email column so login-by-email and forgot-password lookups use an index instead of full scan.
SET @sql := (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'login_users' AND INDEX_NAME = 'ix_email') = 0,
  'ALTER TABLE `login_users` ADD INDEX `ix_email` (`email`)',
  'SELECT 1'
));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- PERF-04 · Drop redundant UNIQUE KEY `user_id` (duplicates PRIMARY KEY on same column).
SET @sql := (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'login_users' AND INDEX_NAME = 'user_id') > 0,
  'ALTER TABLE `login_users` DROP INDEX `user_id`',
  'SELECT 1'
));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- PERF-03 · Index login_confirm(key, type) so reset-password key lookups use an index.
SET @sql := (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'login_confirm' AND INDEX_NAME = 'ix_key_type') = 0,
  'ALTER TABLE `login_confirm` ADD INDEX `ix_key_type` (`key`, `type`)',
  'SELECT 1'
));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- PERF-05 · Index login_timestamps for user_id lookups (11k+ rows already).
SET @sql := (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'login_timestamps' AND INDEX_NAME = 'ix_user_ts') = 0,
  'ALTER TABLE `login_timestamps` ADD INDEX `ix_user_ts` (`user_id`, `timestamp`)',
  'SELECT 1'
));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- PERF-06 · Index lt_refresh_tokens(expires_at) so future cleanup job (DELETE ... WHERE expires_at < NOW()) uses an index.
SET @sql := (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'lt_refresh_tokens' AND INDEX_NAME = 'ix_expires') = 0,
  'ALTER TABLE `lt_refresh_tokens` ADD INDEX `ix_expires` (`expires_at`)',
  'SELECT 1'
));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
