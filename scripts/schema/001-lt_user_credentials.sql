-- 001 — lt_user_credentials
-- DERIVED PERFORMANCE CACHE, NOT AN AUTHENTICATION SOURCE OF TRUTH.
-- The canonical password remains `login_users.password` (MD5) so both PHP
-- and Node authenticate against one logical value.
--
-- `md5_snapshot` stores the exact `login_users.password` value that was
-- current when we hashed to bcrypt. On each mobile login the auth flow
-- compares this to the live `login_users.password`; a mismatch means PHP
-- (or a DBA, or a mobile reset from another session) has changed the
-- password, so the cache is invalidated and rebuilt from the fresh MD5.
--
-- Safe to TRUNCATE at any time — every user re-verifies via MD5 on next
-- login and repopulates. See docs/audit/09-pre-p1-addendum.md §A.

-- Safe to drop — this is a derived cache with no source-of-truth data.
-- Every user re-verifies via MD5 on next mobile login and repopulates.
DROP TABLE IF EXISTS `lt_user_credentials`;

CREATE TABLE IF NOT EXISTS `lt_user_credentials` (
  `user_id`      INT(8)       NOT NULL,
  `bcrypt_hash`  VARCHAR(60)  NOT NULL,
  `md5_snapshot` CHAR(32)     NOT NULL,
  `updated_at`   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
