CREATE TABLE `menus` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`name` text NOT NULL,
	`data` text NOT NULL,
	`source` text NOT NULL,
	`published` integer DEFAULT 0 NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `translations` (
	`id` text PRIMARY KEY NOT NULL,
	`menu_id` text NOT NULL,
	`language` text NOT NULL,
	`version` integer NOT NULL,
	`data` text,
	`started` integer NOT NULL
);
