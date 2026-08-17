CREATE TABLE `audit_log` (
	`id` text PRIMARY KEY NOT NULL,
	`actor_user_id` text,
	`action` text NOT NULL,
	`target_type` text,
	`target_id` text,
	`meta_json` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `body_models` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`unit_type` text NOT NULL,
	`description` text,
	`base_price_idr` integer DEFAULT 0 NOT NULL,
	`estimated_days` integer DEFAULT 30 NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `customers` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`company` text,
	`phone` text NOT NULL,
	`email` text,
	`address` text,
	`city` text,
	`npwp` text,
	`notes` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `leads` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`company` text,
	`phone` text NOT NULL,
	`email` text,
	`unit_type` text NOT NULL,
	`quantity` integer DEFAULT 1 NOT NULL,
	`message` text,
	`status` text DEFAULT 'baru' NOT NULL,
	`handled_by` text,
	`internal_notes` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`handled_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` text PRIMARY KEY NOT NULL,
	`work_order_id` text NOT NULL,
	`label` text NOT NULL,
	`amount_idr` integer NOT NULL,
	`method` text DEFAULT 'transfer' NOT NULL,
	`paid_at` integer NOT NULL,
	`reference` text,
	`notes` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`work_order_id`) REFERENCES `work_orders`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	`user_agent` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `stages` (
	`id` text PRIMARY KEY NOT NULL,
	`work_order_id` text NOT NULL,
	`sort_order` integer NOT NULL,
	`name` text NOT NULL,
	`weight_percent` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`pic_name` text,
	`started_at` integer,
	`finished_at` integer,
	`notes` text,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`work_order_id`) REFERENCES `work_orders`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`role` text DEFAULT 'produksi' NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`last_login_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `work_orders` (
	`id` text PRIMARY KEY NOT NULL,
	`spk_number` text NOT NULL,
	`customer_id` text NOT NULL,
	`body_model_id` text,
	`unit_type` text NOT NULL,
	`chassis_brand` text NOT NULL,
	`chassis_type` text,
	`chassis_number` text NOT NULL,
	`engine_number` text,
	`police_number` text,
	`color` text,
	`seat_count` integer,
	`spec_notes` text,
	`contract_value_idr` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`priority` text DEFAULT 'normal' NOT NULL,
	`start_date` integer,
	`target_date` integer,
	`delivered_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`body_model_id`) REFERENCES `body_models`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `audit_actor_idx` ON `audit_log` (`actor_user_id`);--> statement-breakpoint
CREATE INDEX `audit_created_idx` ON `audit_log` (`created_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `body_models_code_unique` ON `body_models` (`code`);--> statement-breakpoint
CREATE INDEX `customers_name_idx` ON `customers` (`name`);--> statement-breakpoint
CREATE INDEX `leads_status_idx` ON `leads` (`status`);--> statement-breakpoint
CREATE INDEX `payments_wo_idx` ON `payments` (`work_order_id`);--> statement-breakpoint
CREATE INDEX `sessions_user_idx` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `stages_wo_idx` ON `stages` (`work_order_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `stages_wo_order_unique` ON `stages` (`work_order_id`,`sort_order`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_idx` ON `users` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `work_orders_spk_number_unique` ON `work_orders` (`spk_number`);--> statement-breakpoint
CREATE INDEX `wo_customer_idx` ON `work_orders` (`customer_id`);--> statement-breakpoint
CREATE INDEX `wo_status_idx` ON `work_orders` (`status`);--> statement-breakpoint
CREATE INDEX `wo_chassis_idx` ON `work_orders` (`chassis_number`);