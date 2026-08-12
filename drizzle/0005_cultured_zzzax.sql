CREATE TABLE `site_check_ins` (
	`id` text PRIMARY KEY NOT NULL,
	`person_id` text NOT NULL,
	`source` text DEFAULT 'KIOSK' NOT NULL,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`requested_at` text NOT NULL,
	`verified_at` text,
	`verified_by` text,
	`signed_out_at` text,
	`notes` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`person_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_site_check_ins_status_requested_at` ON `site_check_ins` (`status`,`requested_at`);--> statement-breakpoint
CREATE INDEX `idx_site_check_ins_person_requested_at` ON `site_check_ins` (`person_id`,`requested_at`);