CREATE TABLE `post_destinations` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`platform` text NOT NULL,
	`destination_type` text NOT NULL,
	`destination_id` text NOT NULL,
	`destination_name` text NOT NULL,
	`destination_metadata` text,
	`last_used_at` integer NOT NULL,
	`use_count` integer DEFAULT 1 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `posts` ADD `destination_type` text;--> statement-breakpoint
ALTER TABLE `posts` ADD `destination_id` text;--> statement-breakpoint
ALTER TABLE `posts` ADD `destination_name` text;--> statement-breakpoint
ALTER TABLE `posts` ADD `destination_metadata` text;