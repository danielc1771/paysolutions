CREATE TYPE "public"."derogatory_type" AS ENUM('manual', 'automatic');--> statement-breakpoint
CREATE TYPE "public"."loan_status" AS ENUM('new', 'application_sent', 'application_in_progress', 'application_completed', 'pending_ipay_signature', 'pending_org_signature', 'pending_borrower_signature', 'ipay_approved', 'dealer_approved', 'fully_signed', 'review', 'approved', 'funded', 'active', 'pending_derogatory_review', 'derogatory', 'settled', 'closed', 'defaulted');--> statement-breakpoint
CREATE TYPE "public"."phone_verification_status" AS ENUM('pending', 'sent', 'verified', 'failed', 'expired');--> statement-breakpoint
CREATE TYPE "public"."profile_status" AS ENUM('INVITED', 'ACTIVE');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('admin', 'organization_owner', 'team_member', 'borrower', 'user');--> statement-breakpoint
CREATE TYPE "public"."stripe_verification_status" AS ENUM('pending', 'requires_action', 'verified', 'canceled', 'unverified', 'processing', 'completed');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('trial', 'active', 'suspended', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."verification_status" AS ENUM('pending', 'email_sent', 'in_progress', 'identity_verified', 'phone_verified', 'completed', 'failed', 'expired');--> statement-breakpoint
CREATE TABLE "borrower_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"borrower_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"note" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "borrower_notes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"email" varchar(255),
	"phone" varchar(255),
	"address" varchar(255),
	"city" varchar(255),
	"state" varchar(255),
	"zip_code" varchar(10),
	"website" varchar(255),
	"description" text,
	"contact_person" varchar(255),
	"tax_id" varchar(255),
	"dealer_license_number" varchar(100),
	"ein_number" varchar(20),
	"subscription_status" "subscription_status" DEFAULT 'trial',
	"subscription_start_date" timestamp,
	"subscription_end_date" timestamp,
	"monthly_loan_limit" integer DEFAULT 100,
	"total_users_limit" integer DEFAULT 10,
	"is_active" boolean DEFAULT true,
	"missed_payment_threshold" integer DEFAULT 2,
	"stripe_customer_id" varchar(255),
	"stripe_verification_subscription_id" varchar(255),
	"stripe_verification_subscription_item_id" varchar(255),
	"stripe_verification_price_id" varchar(255),
	"verification_billing_status" varchar(50) DEFAULT 'inactive'
);
--> statement-breakpoint
CREATE TABLE "organization_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"allow_team_member_invites" boolean DEFAULT true,
	"allow_borrower_self_registration" boolean DEFAULT false,
	"max_loan_amount" numeric(12, 2) DEFAULT '25000.00',
	"min_loan_amount" numeric(12, 2) DEFAULT '1000.00',
	"default_interest_rate" numeric(5, 4) DEFAULT '8.9900',
	"require_docusign_for_all_loans" boolean DEFAULT true,
	"allow_extra_payments" boolean DEFAULT true,
	"notifications_enabled" boolean DEFAULT true,
	"logo_url" varchar(255),
	"color_theme" varchar(50) DEFAULT 'default',
	"enable_loans" boolean DEFAULT true,
	"enable_standalone_verifications" boolean DEFAULT false,
	"verifications_require_phone" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "organization_settings_organization_id_key" UNIQUE("organization_id")
);
--> statement-breakpoint
ALTER TABLE "organization_settings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid,
	"role" "role" DEFAULT 'team_member',
	"full_name" varchar(255),
	"email" varchar(255),
	"cell_phone" varchar(20),
	"status" "profile_status" DEFAULT 'INVITED'
);
--> statement-breakpoint
CREATE TABLE "verification_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"verification_id" uuid NOT NULL,
	"stripe_usage_record_id" varchar(255),
	"reported_at" timestamp with time zone,
	"quantity" integer DEFAULT 1,
	"billing_period_start" timestamp with time zone,
	"billing_period_end" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "verification_usage_verification_id_key" UNIQUE("verification_id")
);
--> statement-breakpoint
ALTER TABLE "verification_usage" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "verifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"created_by" uuid,
	"first_name" varchar(255) NOT NULL,
	"last_name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"phone" varchar(20),
	"date_of_birth" date,
	"address" varchar(255),
	"city" varchar(100),
	"state" varchar(50),
	"zip_code" varchar(10),
	"country" varchar(2) DEFAULT 'US',
	"stripe_verification_session_id" varchar(255),
	"stripe_verification_status" "stripe_verification_status" DEFAULT 'pending',
	"stripe_verified_at" timestamp with time zone,
	"stripe_verification_url" text,
	"phone_verification_session_id" varchar(255),
	"phone_verification_status" "phone_verification_status" DEFAULT 'pending',
	"verified_phone_number" varchar(20),
	"phone_verified_at" timestamp with time zone,
	"verification_result_data" text,
	"document_type" varchar(50),
	"status" "verification_status" DEFAULT 'pending',
	"purpose" text,
	"verification_token" varchar(255),
	"expires_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"email_sent_at" timestamp with time zone,
	"email_sent_count" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "verifications_verification_token_key" UNIQUE("verification_token")
);
--> statement-breakpoint
ALTER TABLE "verifications" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "loans" DROP CONSTRAINT "check_positive_amounts";--> statement-breakpoint
ALTER TABLE "borrowers" ALTER COLUMN "email" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "loans" ALTER COLUMN "term_months" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "loans" ALTER COLUMN "monthly_payment" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "loans" ALTER COLUMN "status" SET DEFAULT 'new'::"public"."loan_status";--> statement-breakpoint
ALTER TABLE "loans" ALTER COLUMN "status" SET DATA TYPE "public"."loan_status" USING "status"::"public"."loan_status";--> statement-breakpoint
ALTER TABLE "borrowers" ADD COLUMN "address" varchar(255);--> statement-breakpoint
ALTER TABLE "borrowers" ADD COLUMN "country" varchar(2) DEFAULT 'US';--> statement-breakpoint
ALTER TABLE "borrowers" ADD COLUMN "current_employer_name" varchar(255);--> statement-breakpoint
ALTER TABLE "borrowers" ADD COLUMN "employer_state" varchar(50);--> statement-breakpoint
ALTER TABLE "borrowers" ADD COLUMN "time_with_employment" varchar(50);--> statement-breakpoint
ALTER TABLE "borrowers" ADD COLUMN "preferred_language" varchar(10) DEFAULT 'en';--> statement-breakpoint
ALTER TABLE "borrowers" ADD COLUMN "reference1_name" varchar(255);--> statement-breakpoint
ALTER TABLE "borrowers" ADD COLUMN "reference1_phone" varchar(20);--> statement-breakpoint
ALTER TABLE "borrowers" ADD COLUMN "reference1_email" varchar(255);--> statement-breakpoint
ALTER TABLE "borrowers" ADD COLUMN "reference1_country_code" varchar(5) DEFAULT '+1';--> statement-breakpoint
ALTER TABLE "borrowers" ADD COLUMN "reference2_name" varchar(255);--> statement-breakpoint
ALTER TABLE "borrowers" ADD COLUMN "reference2_phone" varchar(20);--> statement-breakpoint
ALTER TABLE "borrowers" ADD COLUMN "reference2_email" varchar(255);--> statement-breakpoint
ALTER TABLE "borrowers" ADD COLUMN "reference2_country_code" varchar(5) DEFAULT '+1';--> statement-breakpoint
ALTER TABLE "borrowers" ADD COLUMN "reference3_name" varchar(255);--> statement-breakpoint
ALTER TABLE "borrowers" ADD COLUMN "reference3_phone" varchar(20);--> statement-breakpoint
ALTER TABLE "borrowers" ADD COLUMN "reference3_email" varchar(255);--> statement-breakpoint
ALTER TABLE "borrowers" ADD COLUMN "communication_consent" text;--> statement-breakpoint
ALTER TABLE "borrowers" ADD COLUMN "stripe_customer_id" varchar(255);--> statement-breakpoint
ALTER TABLE "borrowers" ADD COLUMN "organization_id" uuid;--> statement-breakpoint
ALTER TABLE "loans" ADD COLUMN "amount" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "loans" ADD COLUMN "term_weeks" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "loans" ADD COLUMN "weekly_payment" numeric(10, 2) NOT NULL;--> statement-breakpoint
ALTER TABLE "loans" ADD COLUMN "loan_type" varchar(100);--> statement-breakpoint
ALTER TABLE "loans" ADD COLUMN "docusign_ipay_email" varchar(255);--> statement-breakpoint
ALTER TABLE "loans" ADD COLUMN "docusign_org_email" varchar(255);--> statement-breakpoint
ALTER TABLE "loans" ADD COLUMN "docusign_org_name" varchar(255);--> statement-breakpoint
ALTER TABLE "loans" ADD COLUMN "docusign_borrower_email" varchar(255);--> statement-breakpoint
ALTER TABLE "loans" ADD COLUMN "ipay_signing_url" text;--> statement-breakpoint
ALTER TABLE "loans" ADD COLUMN "organization_signing_url" text;--> statement-breakpoint
ALTER TABLE "loans" ADD COLUMN "borrower_signing_url" text;--> statement-breakpoint
ALTER TABLE "loans" ADD COLUMN "signing_urls_generated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "loans" ADD COLUMN "ipay_signed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "loans" ADD COLUMN "organization_signed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "loans" ADD COLUMN "borrower_signed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "loans" ADD COLUMN "vehicle_year" varchar(4) NOT NULL;--> statement-breakpoint
ALTER TABLE "loans" ADD COLUMN "vehicle_make" varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE "loans" ADD COLUMN "vehicle_model" varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE "loans" ADD COLUMN "vehicle_vin" varchar(17) NOT NULL;--> statement-breakpoint
ALTER TABLE "loans" ADD COLUMN "customer_first_name" varchar(255);--> statement-breakpoint
ALTER TABLE "loans" ADD COLUMN "customer_last_name" varchar(255);--> statement-breakpoint
ALTER TABLE "loans" ADD COLUMN "created_by" uuid;--> statement-breakpoint
ALTER TABLE "loans" ADD COLUMN "organization_id" uuid;--> statement-breakpoint
ALTER TABLE "loans" ADD COLUMN "application_step" integer DEFAULT 1;--> statement-breakpoint
ALTER TABLE "loans" ADD COLUMN "stripe_verification_session_id" varchar(255);--> statement-breakpoint
ALTER TABLE "loans" ADD COLUMN "stripe_verification_status" "stripe_verification_status" DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE "loans" ADD COLUMN "phone_verification_session_id" varchar(255);--> statement-breakpoint
ALTER TABLE "loans" ADD COLUMN "phone_verification_status" "phone_verification_status" DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE "loans" ADD COLUMN "verified_phone_number" varchar(20);--> statement-breakpoint
ALTER TABLE "loans" ADD COLUMN "stripe_subscription_id" varchar(255);--> statement-breakpoint
ALTER TABLE "loans" ADD COLUMN "stripe_product_id" varchar(255);--> statement-breakpoint
ALTER TABLE "loans" ADD COLUMN "stripe_price_id" varchar(255);--> statement-breakpoint
ALTER TABLE "loans" ADD COLUMN "derogatory_status" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "loans" ADD COLUMN "derogatory_reason" text;--> statement-breakpoint
ALTER TABLE "loans" ADD COLUMN "derogatory_date" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "loans" ADD COLUMN "derogatory_marked_by" uuid;--> statement-breakpoint
ALTER TABLE "loans" ADD COLUMN "derogatory_type" "derogatory_type";--> statement-breakpoint
ALTER TABLE "loans" ADD COLUMN "closure_reason" text;--> statement-breakpoint
ALTER TABLE "loans" ADD COLUMN "closure_date" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "loans" ADD COLUMN "closed_by" uuid;--> statement-breakpoint
ALTER TABLE "loans" ADD COLUMN "is_late" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "loans" ADD COLUMN "days_overdue" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "loans" ADD COLUMN "last_payment_check" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "borrower_notes" ADD CONSTRAINT "borrower_notes_borrower_id_borrowers_id_fk" FOREIGN KEY ("borrower_id") REFERENCES "public"."borrowers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "borrower_notes" ADD CONSTRAINT "borrower_notes_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "borrower_notes" ADD CONSTRAINT "borrower_notes_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "borrower_notes" ADD CONSTRAINT "borrower_notes_borrower_id_fkey" FOREIGN KEY ("borrower_id") REFERENCES "public"."borrowers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "borrower_notes" ADD CONSTRAINT "borrower_notes_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "borrower_notes" ADD CONSTRAINT "borrower_notes_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_settings" ADD CONSTRAINT "organization_settings_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_settings" ADD CONSTRAINT "organization_settings_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_usage" ADD CONSTRAINT "verification_usage_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_usage" ADD CONSTRAINT "verification_usage_verification_id_verifications_id_fk" FOREIGN KEY ("verification_id") REFERENCES "public"."verifications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_usage" ADD CONSTRAINT "verification_usage_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_usage" ADD CONSTRAINT "verification_usage_verification_id_fkey" FOREIGN KEY ("verification_id") REFERENCES "public"."verifications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verifications" ADD CONSTRAINT "verifications_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verifications" ADD CONSTRAINT "verifications_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verifications" ADD CONSTRAINT "verifications_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verifications" ADD CONSTRAINT "verifications_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_borrower_notes_borrower_id" ON "borrower_notes" USING btree ("borrower_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_borrower_notes_organization_id" ON "borrower_notes" USING btree ("organization_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_verification_usage_organization_id" ON "verification_usage" USING btree ("organization_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_verification_usage_reported_at" ON "verification_usage" USING btree ("reported_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_verifications_organization_id" ON "verifications" USING btree ("organization_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_verifications_email" ON "verifications" USING btree ("email" text_ops);--> statement-breakpoint
CREATE INDEX "idx_verifications_status" ON "verifications" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_verifications_created_at" ON "verifications" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_verifications_token" ON "verifications" USING btree ("verification_token" text_ops);--> statement-breakpoint
ALTER TABLE "borrowers" ADD CONSTRAINT "borrowers_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loans" ADD CONSTRAINT "loans_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loans" ADD CONSTRAINT "loans_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loans" ADD CONSTRAINT "loans_derogatory_marked_by_profiles_id_fk" FOREIGN KEY ("derogatory_marked_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loans" ADD CONSTRAINT "loans_closed_by_profiles_id_fk" FOREIGN KEY ("closed_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "borrowers" DROP COLUMN "ssn";--> statement-breakpoint
ALTER TABLE "loans" DROP COLUMN "docusign_status";--> statement-breakpoint
ALTER TABLE "loans" DROP COLUMN "docusign_status_updated";--> statement-breakpoint
ALTER TABLE "loans" ADD CONSTRAINT "check_positive_amounts" CHECK ((principal_amount > (0)::numeric) AND (interest_rate >= (0)::numeric) AND (term_weeks > 0) AND (weekly_payment > (0)::numeric));--> statement-breakpoint
CREATE POLICY "Enable all operations for service role" ON "borrower_notes" AS PERMISSIVE FOR ALL TO public USING (true);--> statement-breakpoint
CREATE POLICY "Enable all operations for service role" ON "organization_settings" AS PERMISSIVE FOR ALL TO public USING (true);--> statement-breakpoint
CREATE POLICY "Enable all operations for service role" ON "verification_usage" AS PERMISSIVE FOR ALL TO public USING (true);--> statement-breakpoint
CREATE POLICY "Enable all operations for service role" ON "verifications" AS PERMISSIVE FOR ALL TO public USING (true);