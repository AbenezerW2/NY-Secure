CREATE TABLE `access_assignments` (
	`id` text PRIMARY KEY NOT NULL,
	`person_id` text NOT NULL,
	`profile_id` text NOT NULL,
	`valid_from` text NOT NULL,
	`valid_until` text,
	`reason` text DEFAULT '' NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`revoked_at` text,
	`revoked_reason` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`person_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`profile_id`) REFERENCES `access_profiles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_access_assignments_person_active` ON `access_assignments` (`person_id`,`active`);--> statement-breakpoint
CREATE INDEX `idx_access_assignments_profile_active` ON `access_assignments` (`profile_id`,`active`);--> statement-breakpoint
CREATE TABLE `access_events` (
	`id` text PRIMARY KEY NOT NULL,
	`person_id` text NOT NULL,
	`zone_id` text NOT NULL,
	`assignment_id` text,
	`profile_id` text,
	`decision` text NOT NULL,
	`reason_code` text NOT NULL,
	`explanation` text NOT NULL,
	`attempted_at` text NOT NULL,
	FOREIGN KEY (`person_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`zone_id`) REFERENCES `zones`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`assignment_id`) REFERENCES `access_assignments`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`profile_id`) REFERENCES `access_profiles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_access_events_attempted_at` ON `access_events` (`attempted_at`);--> statement-breakpoint
CREATE INDEX `idx_access_events_person_attempted_at` ON `access_events` (`person_id`,`attempted_at`);--> statement-breakpoint
CREATE INDEX `idx_access_events_zone_attempted_at` ON `access_events` (`zone_id`,`attempted_at`);--> statement-breakpoint
CREATE INDEX `idx_access_events_decision_attempted_at` ON `access_events` (`decision`,`attempted_at`);--> statement-breakpoint
CREATE TABLE `access_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`profile_key` text NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`relationship_type` text NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_access_profiles_key` ON `access_profiles` (`profile_key`);--> statement-breakpoint
CREATE INDEX `idx_access_profiles_relationship_active` ON `access_profiles` (`relationship_type`,`active`);--> statement-breakpoint
CREATE TABLE `organizations` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`organization_type` text NOT NULL,
	`contact_email` text,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_organizations_slug` ON `organizations` (`slug`);--> statement-breakpoint
CREATE TABLE `people` (
	`id` text PRIMARY KEY NOT NULL,
	`first_name` text NOT NULL,
	`last_name` text NOT NULL,
	`email` text NOT NULL,
	`organization_id` text NOT NULL,
	`relationship_type` text NOT NULL,
	`job_function` text NOT NULL,
	`badge_number` text NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_people_email` ON `people` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_people_badge_number` ON `people` (`badge_number`);--> statement-breakpoint
CREATE INDEX `idx_people_organization_active` ON `people` (`organization_id`,`active`);--> statement-breakpoint
CREATE INDEX `idx_people_relationship_type` ON `people` (`relationship_type`);--> statement-breakpoint
CREATE TABLE `profile_zone_rules` (
	`id` text PRIMARY KEY NOT NULL,
	`profile_id` text NOT NULL,
	`zone_id` text NOT NULL,
	`permission` text DEFAULT 'ALLOW' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`profile_id`) REFERENCES `access_profiles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`zone_id`) REFERENCES `zones`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_profile_zone_rules_profile_zone` ON `profile_zone_rules` (`profile_id`,`zone_id`);--> statement-breakpoint
CREATE INDEX `idx_profile_zone_rules_zone_permission` ON `profile_zone_rules` (`zone_id`,`permission`);--> statement-breakpoint
CREATE TABLE `zones` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`location` text NOT NULL,
	`security_tier` integer DEFAULT 1 NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_zones_code` ON `zones` (`code`);--> statement-breakpoint
CREATE INDEX `idx_zones_category_active` ON `zones` (`category`,`active`);