CREATE TABLE `scheduled_visits` (
	`ticket_number` text PRIMARY KEY NOT NULL,
	`site_code` text DEFAULT 'DC-01' NOT NULL,
	`organization_id` text NOT NULL,
	`requester_name` text NOT NULL,
	`visitor_name` text NOT NULL,
	`visitor_email` text,
	`visitor_phone` text,
	`cage_zone_id` text NOT NULL,
	`cabinet_access` text DEFAULT '[]' NOT NULL,
	`valid_from` text NOT NULL,
	`valid_until` text NOT NULL,
	`comments` text DEFAULT '' NOT NULL,
	`has_delivery` integer DEFAULT false NOT NULL,
	`package_count` integer DEFAULT 0 NOT NULL,
	`package_details` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'SCHEDULED' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`cage_zone_id`) REFERENCES `zones`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_scheduled_visits_valid_from` ON `scheduled_visits` (`valid_from`);--> statement-breakpoint
CREATE INDEX `idx_scheduled_visits_organization_valid_from` ON `scheduled_visits` (`organization_id`,`valid_from`);