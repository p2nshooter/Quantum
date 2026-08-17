CREATE TABLE `divisions` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
ALTER TABLE `employees` ADD `division_id` text REFERENCES divisions(id);--> statement-breakpoint
ALTER TABLE `employees` ADD `address` text;--> statement-breakpoint
ALTER TABLE `employees` ADD `id_number` text;--> statement-breakpoint
ALTER TABLE `employees` ADD `employment_type` text DEFAULT 'tetap' NOT NULL;--> statement-breakpoint
ALTER TABLE `employees` ADD `status` text DEFAULT 'aktif' NOT NULL;--> statement-breakpoint
ALTER TABLE `employees` ADD `join_date` integer;--> statement-breakpoint
ALTER TABLE `employees` ADD `contract_number` text;--> statement-breakpoint
ALTER TABLE `employees` ADD `contract_start` integer;--> statement-breakpoint
ALTER TABLE `employees` ADD `contract_end` integer;--> statement-breakpoint
ALTER TABLE `employees` ADD `daily_rate_idr` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `employees` ADD `notes` text;--> statement-breakpoint
CREATE UNIQUE INDEX `divisions_name_unique` ON `divisions` (`name`);--> statement-breakpoint
CREATE INDEX `employees_division_idx` ON `employees` (`division_id`);--> statement-breakpoint
CREATE INDEX `employees_status_idx` ON `employees` (`status`);--> statement-breakpoint
/*
 SQLite does not support "Creating foreign key on existing column" out of the box, we do not generate automatic migration for that, so it has to be done manually
 Please refer to: https://www.techonthenet.com/sqlite/tables/alter_table.php
                  https://www.sqlite.org/lang_altertable.html

 Due to that we don't generate migration automatically and it has to be done manually
*/