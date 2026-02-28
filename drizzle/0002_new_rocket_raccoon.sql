PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text,
	`password_hash` text,
	`oauth_provider` text,
	`oauth_id` text,
	`avatar_url` text,
	`username` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_users`("id", "email", "password_hash", "oauth_provider", "oauth_id", "avatar_url", "username", "created_at") SELECT "id", "email", "password_hash", "oauth_provider", "oauth_id", "avatar_url", "username", "created_at" FROM `users`;--> statement-breakpoint
DROP TABLE `users`;--> statement-breakpoint
ALTER TABLE `__new_users` RENAME TO `users`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `oauth_unique` ON `users` (`oauth_provider`,`oauth_id`);