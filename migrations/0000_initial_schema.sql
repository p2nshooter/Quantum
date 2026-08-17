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
CREATE TABLE `capital_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`owner_name` text NOT NULL,
	`amount_idr` integer NOT NULL,
	`method` text DEFAULT 'transfer' NOT NULL,
	`entry_at` integer NOT NULL,
	`notes` text,
	`created_by` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
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
CREATE TABLE `expenses` (
	`id` text PRIMARY KEY NOT NULL,
	`category` text DEFAULT 'lainnya' NOT NULL,
	`description` text NOT NULL,
	`amount_idr` integer NOT NULL,
	`vendor_name` text,
	`work_order_id` text,
	`spent_at` integer NOT NULL,
	`paid_at` integer,
	`due_date` integer,
	`method` text,
	`notes` text,
	`created_by` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`work_order_id`) REFERENCES `work_orders`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `items` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`kind` text DEFAULT 'barang' NOT NULL,
	`unit` text DEFAULT 'pcs' NOT NULL,
	`cost_price_idr` integer DEFAULT 0 NOT NULL,
	`sell_price_idr` integer DEFAULT 0 NOT NULL,
	`stock_qty` integer DEFAULT 0 NOT NULL,
	`min_stock_qty` integer DEFAULT 0 NOT NULL,
	`show_on_landing` integer DEFAULT false NOT NULL,
	`active` integer DEFAULT true NOT NULL,
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
	`ref_type` text NOT NULL,
	`ref_id` text NOT NULL,
	`label` text NOT NULL,
	`amount_idr` integer NOT NULL,
	`method` text DEFAULT 'transfer' NOT NULL,
	`paid_at` integer NOT NULL,
	`reference` text,
	`notes` text,
	`created_by` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `promos` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text DEFAULT 'promo' NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`emoji` text DEFAULT '🎉' NOT NULL,
	`normal_price_idr` integer,
	`promo_price_idr` integer,
	`cta_label` text,
	`starts_at` integer,
	`ends_at` integer,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `purchase_items` (
	`id` text PRIMARY KEY NOT NULL,
	`purchase_id` text NOT NULL,
	`item_id` text,
	`name` text NOT NULL,
	`qty` integer DEFAULT 1 NOT NULL,
	`unit_cost_idr` integer DEFAULT 0 NOT NULL,
	`subtotal_idr` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`purchase_id`) REFERENCES `purchases`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `purchases` (
	`id` text PRIMARY KEY NOT NULL,
	`purchase_number` text NOT NULL,
	`supplier_id` text,
	`supplier_name` text,
	`invoice_number` text,
	`total_idr` integer DEFAULT 0 NOT NULL,
	`paid_idr` integer DEFAULT 0 NOT NULL,
	`purchased_at` integer NOT NULL,
	`due_date` integer,
	`notes` text,
	`created_by` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `service_order_items` (
	`id` text PRIMARY KEY NOT NULL,
	`service_order_id` text NOT NULL,
	`item_id` text,
	`name` text NOT NULL,
	`kind` text DEFAULT 'jasa' NOT NULL,
	`qty` integer DEFAULT 1 NOT NULL,
	`unit_price_idr` integer DEFAULT 0 NOT NULL,
	`unit_cost_idr` integer DEFAULT 0 NOT NULL,
	`subtotal_idr` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`service_order_id`) REFERENCES `service_orders`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `service_orders` (
	`id` text PRIMARY KEY NOT NULL,
	`order_number` text NOT NULL,
	`customer_id` text NOT NULL,
	`police_number` text NOT NULL,
	`vehicle_brand` text,
	`vehicle_model` text,
	`vehicle_year` integer,
	`odometer_km` integer,
	`complaint` text,
	`diagnosis` text,
	`mechanic_name` text,
	`status` text DEFAULT 'antrian' NOT NULL,
	`subtotal_idr` integer DEFAULT 0 NOT NULL,
	`discount_idr` integer DEFAULT 0 NOT NULL,
	`tax_percent` integer DEFAULT 0 NOT NULL,
	`tax_idr` integer DEFAULT 0 NOT NULL,
	`total_idr` integer DEFAULT 0 NOT NULL,
	`cogs_idr` integer DEFAULT 0 NOT NULL,
	`check_in_at` integer,
	`finished_at` integer,
	`picked_up_at` integer,
	`notes` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action
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
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_by` text,
	FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
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
CREATE TABLE `stock_moves` (
	`id` text PRIMARY KEY NOT NULL,
	`item_id` text NOT NULL,
	`type` text NOT NULL,
	`qty` integer NOT NULL,
	`unit_cost_idr` integer DEFAULT 0 NOT NULL,
	`ref_type` text,
	`ref_id` text,
	`notes` text,
	`moved_at` integer NOT NULL,
	`created_by` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `suppliers` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`phone` text,
	`address` text,
	`notes` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
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
	`job_type` text DEFAULT 'karoseri' NOT NULL,
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
	`insurer_name` text,
	`policy_number` text,
	`claim_number` text,
	`surveyor_name` text,
	`deductible_idr` integer DEFAULT 0 NOT NULL,
	`contract_value_idr` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`priority` text DEFAULT 'normal' NOT NULL,
	`start_date` integer,
	`target_date` integer,
	`completed_at` integer,
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
CREATE INDEX `capital_entry_idx` ON `capital_entries` (`entry_at`);--> statement-breakpoint
CREATE INDEX `customers_name_idx` ON `customers` (`name`);--> statement-breakpoint
CREATE INDEX `expenses_spent_idx` ON `expenses` (`spent_at`);--> statement-breakpoint
CREATE INDEX `expenses_category_idx` ON `expenses` (`category`);--> statement-breakpoint
CREATE INDEX `expenses_wo_idx` ON `expenses` (`work_order_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `items_code_unique` ON `items` (`code`);--> statement-breakpoint
CREATE INDEX `items_kind_idx` ON `items` (`kind`);--> statement-breakpoint
CREATE INDEX `leads_status_idx` ON `leads` (`status`);--> statement-breakpoint
CREATE INDEX `payments_ref_idx` ON `payments` (`ref_type`,`ref_id`);--> statement-breakpoint
CREATE INDEX `payments_paid_idx` ON `payments` (`paid_at`);--> statement-breakpoint
CREATE INDEX `promos_active_idx` ON `promos` (`active`);--> statement-breakpoint
CREATE INDEX `purchase_items_purchase_idx` ON `purchase_items` (`purchase_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `purchases_purchase_number_unique` ON `purchases` (`purchase_number`);--> statement-breakpoint
CREATE INDEX `purchases_purchased_idx` ON `purchases` (`purchased_at`);--> statement-breakpoint
CREATE INDEX `purchases_supplier_idx` ON `purchases` (`supplier_id`);--> statement-breakpoint
CREATE INDEX `soi_order_idx` ON `service_order_items` (`service_order_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `service_orders_order_number_unique` ON `service_orders` (`order_number`);--> statement-breakpoint
CREATE INDEX `so_customer_idx` ON `service_orders` (`customer_id`);--> statement-breakpoint
CREATE INDEX `so_status_idx` ON `service_orders` (`status`);--> statement-breakpoint
CREATE INDEX `so_plate_idx` ON `service_orders` (`police_number`);--> statement-breakpoint
CREATE INDEX `sessions_user_idx` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `stages_wo_idx` ON `stages` (`work_order_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `stages_wo_order_unique` ON `stages` (`work_order_id`,`sort_order`);--> statement-breakpoint
CREATE INDEX `stock_moves_item_idx` ON `stock_moves` (`item_id`);--> statement-breakpoint
CREATE INDEX `stock_moves_moved_idx` ON `stock_moves` (`moved_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_idx` ON `users` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `work_orders_spk_number_unique` ON `work_orders` (`spk_number`);--> statement-breakpoint
CREATE INDEX `wo_customer_idx` ON `work_orders` (`customer_id`);--> statement-breakpoint
CREATE INDEX `wo_completed_idx` ON `work_orders` (`completed_at`);--> statement-breakpoint
CREATE INDEX `wo_status_idx` ON `work_orders` (`status`);--> statement-breakpoint
CREATE INDEX `wo_chassis_idx` ON `work_orders` (`chassis_number`);--> statement-breakpoint
CREATE INDEX `wo_job_type_idx` ON `work_orders` (`job_type`);