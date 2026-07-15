-- 008-php-2fa-columns.sql
-- Bring local dev `login_users` to parity with PHP schema (upgrade_410).
-- Non-destructive: adds NULLABLE columns only if missing.
-- Real PHP-deployed databases already have these; this file is a safety net
-- for freshly-provisioned dev DBs that skipped the PHP upgrade path.

SET @has_tmp_auth := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'login_users'
     AND COLUMN_NAME = 'tmp_auth_token'
);
SET @sql := IF(@has_tmp_auth = 0,
  'ALTER TABLE `login_users` ADD COLUMN `tmp_auth_token` INT(8) NULL DEFAULT NULL',
  'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @has_sms_time := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'login_users'
     AND COLUMN_NAME = 'sms_time'
);
SET @sql := IF(@has_sms_time = 0,
  'ALTER TABLE `login_users` ADD COLUMN `sms_time` INT(11) NULL DEFAULT NULL',
  'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @has_phone := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'login_users'
     AND COLUMN_NAME = 'phone'
);
SET @sql := IF(@has_phone = 0,
  'ALTER TABLE `login_users` ADD COLUMN `phone` VARCHAR(12) NULL DEFAULT NULL',
  'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @has_2fa := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'login_users'
     AND COLUMN_NAME = 'use_two_factor_auth'
);
SET @sql := IF(@has_2fa = 0,
  'ALTER TABLE `login_users` ADD COLUMN `use_two_factor_auth` VARCHAR(2) NULL DEFAULT NULL',
  'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
