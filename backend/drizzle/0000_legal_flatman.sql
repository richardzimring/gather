CREATE TYPE "public"."calendar_provider" AS ENUM('apple', 'google', 'outlook');--> statement-breakpoint
CREATE TYPE "public"."event_status" AS ENUM('draft', 'active', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."friendship_status" AS ENUM('pending', 'accepted', 'blocked');--> statement-breakpoint
CREATE TYPE "public"."invitee_status" AS ENUM('pending', 'accepted', 'declined', 'maybe');--> statement-breakpoint
CREATE TYPE "public"."recurring_pattern" AS ENUM('daily', 'weekly', 'biweekly', 'monthly');--> statement-breakpoint
CREATE TABLE "blocked_windows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"start_time" timestamp with time zone NOT NULL,
	"end_time" timestamp with time zone NOT NULL,
	"recurring_pattern" "recurring_pattern",
	"recurring_days_of_week" integer[],
	"recurring_end_date" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "calendar_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" "calendar_provider" NOT NULL,
	"external_calendar_id" varchar(255) NOT NULL,
	"calendar_name" varchar(255) NOT NULL,
	"color" varchar(20),
	"import_enabled" boolean DEFAULT true NOT NULL,
	"export_enabled" boolean DEFAULT false NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"token_expires_at" timestamp with time zone,
	"last_sync_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "calendar_events_cache" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"connection_id" uuid NOT NULL,
	"external_event_id" varchar(255) NOT NULL,
	"start_time" timestamp with time zone NOT NULL,
	"end_time" timestamp with time zone NOT NULL,
	"is_busy" boolean DEFAULT true NOT NULL,
	"last_fetched_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "emoji_cache" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"text" text NOT NULL,
	"emoji" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_invitees" (
	"event_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"status" "invitee_status" DEFAULT 'pending' NOT NULL,
	"responded_at" timestamp with time zone,
	"counter_proposal_start_time" timestamp with time zone,
	"counter_proposal_end_time" timestamp with time zone,
	"counter_proposal_location" varchar(200),
	"counter_proposal_message" text,
	CONSTRAINT "event_invitees_event_id_user_id_pk" PRIMARY KEY("event_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"host_id" uuid NOT NULL,
	"title" varchar(100) NOT NULL,
	"emoji" varchar(10),
	"start_time" timestamp with time zone NOT NULL,
	"end_time" timestamp with time zone NOT NULL,
	"location" varchar(200),
	"location_place_id" varchar(255),
	"location_address" text,
	"latitude" varchar(50),
	"longitude" varchar(50),
	"notes" text,
	"show_invite_list" boolean DEFAULT true NOT NULL,
	"status" "event_status" DEFAULT 'active' NOT NULL,
	"is_recurring" boolean DEFAULT false NOT NULL,
	"event_recurring_pattern" "recurring_pattern",
	"event_recurring_days_of_week" integer[],
	"event_recurring_end_date" timestamp with time zone,
	"calendar_event_id" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "friendships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"friend_id" uuid NOT NULL,
	"status" "friendship_status" DEFAULT 'pending' NOT NULL,
	"initiated_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"accepted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "group_members" (
	"group_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "group_members_group_id_user_id_pk" PRIMARY KEY("group_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"name" varchar(50) NOT NULL,
	"emoji" varchar(10),
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reporter_id" uuid NOT NULL,
	"reported_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"apple_user_id" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"first_name" varchar(50) NOT NULL,
	"last_name" varchar(50) NOT NULL,
	"avatar_url" text,
	"invite_code" varchar(8),
	"calendar_sync_enabled" boolean DEFAULT false NOT NULL,
	"push_token" text,
	"notification_preferences" jsonb,
	"timezone" varchar(100) DEFAULT 'America/New_York' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "blocked_windows" ADD CONSTRAINT "blocked_windows_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_connections" ADD CONSTRAINT "calendar_connections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_events_cache" ADD CONSTRAINT "calendar_events_cache_connection_id_calendar_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."calendar_connections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_invitees" ADD CONSTRAINT "event_invitees_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_invitees" ADD CONSTRAINT "event_invitees_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_host_id_users_id_fk" FOREIGN KEY ("host_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "friendships" ADD CONSTRAINT "friendships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "friendships" ADD CONSTRAINT "friendships_friend_id_users_id_fk" FOREIGN KEY ("friend_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "friendships" ADD CONSTRAINT "friendships_initiated_by_users_id_fk" FOREIGN KEY ("initiated_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "groups" ADD CONSTRAINT "groups_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_reports" ADD CONSTRAINT "user_reports_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_reports" ADD CONSTRAINT "user_reports_reported_id_users_id_fk" FOREIGN KEY ("reported_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "blocked_windows_user_id_idx" ON "blocked_windows" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "blocked_windows_start_time_idx" ON "blocked_windows" USING btree ("start_time");--> statement-breakpoint
CREATE INDEX "blocked_windows_user_time_idx" ON "blocked_windows" USING btree ("user_id","start_time","end_time");--> statement-breakpoint
CREATE INDEX "calendar_connections_user_id_idx" ON "calendar_connections" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "calendar_connections_user_provider_calendar_idx" ON "calendar_connections" USING btree ("user_id","provider","external_calendar_id");--> statement-breakpoint
CREATE INDEX "calendar_events_cache_connection_id_idx" ON "calendar_events_cache" USING btree ("connection_id");--> statement-breakpoint
CREATE INDEX "calendar_events_cache_start_time_idx" ON "calendar_events_cache" USING btree ("start_time");--> statement-breakpoint
CREATE UNIQUE INDEX "calendar_events_cache_connection_event_idx" ON "calendar_events_cache" USING btree ("connection_id","external_event_id","start_time");--> statement-breakpoint
CREATE UNIQUE INDEX "emoji_cache_text_idx" ON "emoji_cache" USING btree ("text");--> statement-breakpoint
CREATE INDEX "event_invitees_user_id_idx" ON "event_invitees" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "event_invitees_status_idx" ON "event_invitees" USING btree ("status");--> statement-breakpoint
CREATE INDEX "event_invitees_user_status_idx" ON "event_invitees" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "events_host_id_idx" ON "events" USING btree ("host_id");--> statement-breakpoint
CREATE INDEX "events_start_time_idx" ON "events" USING btree ("start_time");--> statement-breakpoint
CREATE INDEX "events_status_idx" ON "events" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "friendships_user_friend_idx" ON "friendships" USING btree ("user_id","friend_id");--> statement-breakpoint
CREATE INDEX "friendships_friend_id_idx" ON "friendships" USING btree ("friend_id");--> statement-breakpoint
CREATE INDEX "friendships_status_idx" ON "friendships" USING btree ("status");--> statement-breakpoint
CREATE INDEX "group_members_user_id_idx" ON "group_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "groups_owner_id_idx" ON "groups" USING btree ("owner_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_reports_reporter_reported_idx" ON "user_reports" USING btree ("reporter_id","reported_id");--> statement-breakpoint
CREATE INDEX "user_reports_reported_id_idx" ON "user_reports" USING btree ("reported_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_apple_user_id_idx" ON "users" USING btree ("apple_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_invite_code_idx" ON "users" USING btree ("invite_code");--> statement-breakpoint
CREATE INDEX "users_email_idx" ON "users" USING btree ("email");