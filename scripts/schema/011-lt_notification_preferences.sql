CREATE TABLE IF NOT EXISTS `lt_notification_preferences` (
  `event_type` VARCHAR(64) NOT NULL,
  `notify_admin` TINYINT(1) NOT NULL DEFAULT 1,
  `notify_manager` TINYINT(1) NOT NULL DEFAULT 1,
  `updated_by` INT(8) NULL,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`event_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
INSERT IGNORE INTO `lt_notification_preferences` (event_type, notify_admin, notify_manager) VALUES
  ('TIMESHEET_SUBMITTED', 1, 1),
  ('INCIDENT_REPORTED', 1, 1),
  ('VEHICLE_CHECK_SUBMITTED', 1, 1);