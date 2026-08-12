CREATE TABLE `alarms` (
	`id` text PRIMARY KEY NOT NULL,
	`alarm_type` text NOT NULL,
	`severity` text DEFAULT 'MEDIUM' NOT NULL,
	`person_id` text,
	`actor_label` text DEFAULT 'System' NOT NULL,
	`zone_id` text NOT NULL,
	`source` text DEFAULT 'Access control' NOT NULL,
	`detail` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'ACTIVE' NOT NULL,
	`occurred_at` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`person_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`zone_id`) REFERENCES `zones`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_alarms_occurred_at` ON `alarms` (`occurred_at`);--> statement-breakpoint
CREATE INDEX `idx_alarms_type_status` ON `alarms` (`alarm_type`,`status`);--> statement-breakpoint
CREATE INDEX `idx_alarms_zone_occurred_at` ON `alarms` (`zone_id`,`occurred_at`);