ALTER TABLE "users" RENAME COLUMN "invite_code" TO "friend_code";--> statement-breakpoint
DROP INDEX "users_invite_code_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "users_friend_code_idx" ON "users" USING btree ("friend_code");