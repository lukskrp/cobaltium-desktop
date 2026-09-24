CREATE TABLE `glossary_cache` (
	`id` text PRIMARY KEY NOT NULL,
	`word` text NOT NULL,
	`lang` text NOT NULL,
	`analysis_json` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `glossary_cache_word_lang_idx` ON `glossary_cache` (`word`,`lang`);--> statement-breakpoint
CREATE TABLE `messages` (
	`id` text PRIMARY KEY NOT NULL,
	`thread_id` text NOT NULL,
	`role` text NOT NULL,
	`content` text NOT NULL,
	`created_at` integer NOT NULL,
	`immersive_json` text,
	FOREIGN KEY (`thread_id`) REFERENCES `threads`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `messages_thread_id_idx` ON `messages` (`thread_id`);--> statement-breakpoint
CREATE TABLE `saved_folders` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`parent_id` text,
	`lang` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `saved_folders_parent_id_idx` ON `saved_folders` (`parent_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `saved_folders_parent_name_idx` ON `saved_folders` (`parent_id`,`name`);--> statement-breakpoint
CREATE TABLE `saved_phrases` (
	`id` text PRIMARY KEY NOT NULL,
	`phrase` text NOT NULL,
	`lang` text NOT NULL,
	`translation` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL,
	`folder_id` text
);
--> statement-breakpoint
CREATE TABLE `saved_words` (
	`id` text PRIMARY KEY NOT NULL,
	`word` text NOT NULL,
	`lang` text NOT NULL,
	`other_lang` text NOT NULL,
	`translation` text NOT NULL,
	`hover_type` text NOT NULL,
	`pos` text,
	`definitions_json` text,
	`analysis_json` text,
	`saved_at` integer NOT NULL,
	`folder_id` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `saved_words_word_lang_idx` ON `saved_words` (`word`,`lang`);--> statement-breakpoint
CREATE INDEX `saved_words_folder_id_idx` ON `saved_words` (`folder_id`);--> statement-breakpoint
CREATE TABLE `secure_keys` (
	`id` text PRIMARY KEY NOT NULL,
	`ciphertext` text NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `srs_cards` (
	`deck_id` text NOT NULL,
	`card_id` text NOT NULL,
	`ease` real NOT NULL,
	`interval_days` integer NOT NULL,
	`due_epoch_ms` integer NOT NULL,
	`lapses` integer NOT NULL,
	PRIMARY KEY(`deck_id`, `card_id`)
);
--> statement-breakpoint
CREATE INDEX `srs_cards_card_id_idx` ON `srs_cards` (`card_id`);--> statement-breakpoint
CREATE TABLE `srs_deck_cards` (
	`deck_id` text NOT NULL,
	`card_id` text NOT NULL,
	PRIMARY KEY(`deck_id`, `card_id`),
	FOREIGN KEY (`deck_id`) REFERENCES `srs_decks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `srs_deck_cards_card_id_idx` ON `srs_deck_cards` (`card_id`);--> statement-breakpoint
CREATE TABLE `srs_decks` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `srs_decks_name_idx` ON `srs_decks` (`name`);--> statement-breakpoint
CREATE TABLE `threads` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`collapsed` integer NOT NULL,
	`mode` text DEFAULT 'conversation' NOT NULL,
	`starred` integer DEFAULT false NOT NULL,
	`draft` text DEFAULT '' NOT NULL,
	`context_notes` text DEFAULT '' NOT NULL,
	`notes_through_message_id` text DEFAULT '' NOT NULL
);
