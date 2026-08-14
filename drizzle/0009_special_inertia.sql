CREATE TABLE `door_control_events` (
	`id` text PRIMARY KEY NOT NULL,
	`zone_id` text NOT NULL,
	`person_id` text,
	`action` text NOT NULL,
	`detail` text DEFAULT '' NOT NULL,
	`operator_name` text DEFAULT 'Maya Brooks' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`zone_id`) REFERENCES `zones`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`person_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_door_control_events_created_at` ON `door_control_events` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_door_control_events_zone_created_at` ON `door_control_events` (`zone_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `door_controls` (
	`zone_id` text PRIMARY KEY NOT NULL,
	`mode` text DEFAULT 'NORMAL' NOT NULL,
	`granted_person_id` text,
	`grant_expires_at` text,
	`updated_by` text DEFAULT 'Maya Brooks' NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`zone_id`) REFERENCES `zones`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`granted_person_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_door_controls_mode` ON `door_controls` (`mode`);