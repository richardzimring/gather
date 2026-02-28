CREATE TABLE "calendar_event_exports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"destination_id" uuid NOT NULL,
	"external_event_id" varchar(255) NOT NULL,
	"last_synced_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "calendar_export_destinations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" "calendar_provider" NOT NULL,
	"external_calendar_id" varchar(255) NOT NULL,
	"calendar_name" varchar(255) DEFAULT 'Gather' NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "calendar_event_exports" ADD CONSTRAINT "calendar_event_exports_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_event_exports" ADD CONSTRAINT "calendar_event_exports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_event_exports" ADD CONSTRAINT "calendar_event_exports_destination_id_calendar_export_destinations_id_fk" FOREIGN KEY ("destination_id") REFERENCES "public"."calendar_export_destinations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_export_destinations" ADD CONSTRAINT "calendar_export_destinations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "calendar_event_exports_event_destination_idx" ON "calendar_event_exports" USING btree ("event_id","destination_id");--> statement-breakpoint
CREATE INDEX "calendar_event_exports_user_id_idx" ON "calendar_event_exports" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "calendar_event_exports_event_id_idx" ON "calendar_event_exports" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "calendar_event_exports_destination_id_idx" ON "calendar_event_exports" USING btree ("destination_id");--> statement-breakpoint
CREATE UNIQUE INDEX "calendar_export_destinations_user_provider_idx" ON "calendar_export_destinations" USING btree ("user_id","provider");--> statement-breakpoint
CREATE INDEX "calendar_export_destinations_user_id_idx" ON "calendar_export_destinations" USING btree ("user_id");