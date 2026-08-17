CREATE TABLE `employees` (
	`id` text PRIMARY KEY NOT NULL,
	`employee_number` text,
	`name` text NOT NULL,
	`position` text,
	`division` text,
	`phone` text,
	`bank_account` text,
	`base_salary_idr` integer DEFAULT 0 NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `payrolls` (
	`id` text PRIMARY KEY NOT NULL,
	`slip_number` text NOT NULL,
	`employee_id` text NOT NULL,
	`period_from` integer NOT NULL,
	`period_to` integer NOT NULL,
	`paid_at` integer NOT NULL,
	`method` text DEFAULT 'transfer' NOT NULL,
	`components_json` text NOT NULL,
	`gross_idr` integer DEFAULT 0 NOT NULL,
	`deduction_idr` integer DEFAULT 0 NOT NULL,
	`net_idr` integer DEFAULT 0 NOT NULL,
	`notes` text,
	`expense_id` text,
	`created_by` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `payrolls_slip_number_unique` ON `payrolls` (`slip_number`);--> statement-breakpoint
CREATE INDEX `payrolls_employee_idx` ON `payrolls` (`employee_id`);--> statement-breakpoint
CREATE INDEX `payrolls_paid_idx` ON `payrolls` (`paid_at`);