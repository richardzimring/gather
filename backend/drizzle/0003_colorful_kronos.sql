CREATE TYPE "public"."pending_invite_type" AS ENUM('friend', 'event');--> statement-breakpoint
CREATE TABLE "pending_invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "pending_invite_type" NOT NULL,
	"inviter_user_id" uuid NOT NULL,
	"event_id" uuid,
	"phone" varchar(32) NOT NULL,
	"token" varchar(32) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"claimed_by_user_id" uuid,
	"claimed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "phone" varchar(32);--> statement-breakpoint
ALTER TABLE "pending_invites" ADD CONSTRAINT "pending_invites_inviter_user_id_users_id_fk" FOREIGN KEY ("inviter_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pending_invites" ADD CONSTRAINT "pending_invites_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pending_invites" ADD CONSTRAINT "pending_invites_claimed_by_user_id_users_id_fk" FOREIGN KEY ("claimed_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "pending_invites_token_idx" ON "pending_invites" USING btree ("token");--> statement-breakpoint
CREATE INDEX "pending_invites_phone_idx" ON "pending_invites" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "pending_invites_inviter_id_idx" ON "pending_invites" USING btree ("inviter_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "pending_invites_friend_dedupe_idx" ON "pending_invites" USING btree ("inviter_user_id","phone") WHERE "pending_invites"."claimed_by_user_id" is null and "pending_invites"."event_id" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "pending_invites_event_dedupe_idx" ON "pending_invites" USING btree ("inviter_user_id","phone","event_id") WHERE "pending_invites"."claimed_by_user_id" is null and "pending_invites"."event_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "users_phone_idx" ON "users" USING btree ("phone");