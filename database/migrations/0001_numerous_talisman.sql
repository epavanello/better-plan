CREATE TABLE "user_app_credentials" (
	"id" text PRIMARY KEY NOT NULL,
	"platform" "platform" NOT NULL,
	"client_id" text NOT NULL,
	"client_secret" text NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_app_credentials" ADD CONSTRAINT "user_app_credentials_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;