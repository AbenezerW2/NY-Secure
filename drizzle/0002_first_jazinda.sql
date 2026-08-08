ALTER TABLE `organizations` ADD `contact_name` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `organizations` ADD `contact_phone` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `people` ADD `ibx_access_pin` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `people` ADD `credit_hold` integer DEFAULT false NOT NULL;