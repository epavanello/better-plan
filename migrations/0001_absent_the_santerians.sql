CREATE TABLE `ai_usage` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`subscription_id` text NOT NULL,
	`generations_used` integer DEFAULT 0 NOT NULL,
	`context_window_used` integer DEFAULT 0 NOT NULL,
	`period_start` integer NOT NULL,
	`period_end` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`subscription_id`) REFERENCES `subscriptions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `subscriptions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`plan` text DEFAULT 'free' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`polar_subscription_id` text,
	`polar_customer_id` text,
	`current_period_start` integer,
	`current_period_end` integer,
	`ai_generations_limit` integer DEFAULT 0,
	`ai_context_window_limit` integer DEFAULT 0,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `user_context` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`bio` text,
	`profession` text,
	`industry` text,
	`target_audience` text,
	`writing_style` text,
	`tone_of_voice` text,
	`preferred_topics` text,
	`default_post_length` text,
	`use_emojis` integer DEFAULT false,
	`use_hashtags` integer DEFAULT true,
	`custom_instructions` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_context_user_id_unique` ON `user_context` (`user_id`);--> statement-breakpoint
ALTER TABLE `posts` ADD `ai_generated` integer DEFAULT false;--> statement-breakpoint
ALTER TABLE `posts` ADD `ai_prompt` text;--> statement-breakpoint
ALTER TABLE `posts` ADD `ai_model` text;