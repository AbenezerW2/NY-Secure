CREATE TABLE `alarm_comments` (
	`id` text PRIMARY KEY NOT NULL,
	`alarm_id` text NOT NULL,
	`author_name` text DEFAULT 'Maya Brooks' NOT NULL,
	`body` text NOT NULL,
	`kind` text DEFAULT 'NOTE' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`alarm_id`) REFERENCES `alarms`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_alarm_comments_alarm_created_at` ON `alarm_comments` (`alarm_id`,`created_at`);
--> statement-breakpoint
PRAGMA optimize;
