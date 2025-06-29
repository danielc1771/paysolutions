-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TABLE "borrowers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"first_name" varchar(255) NOT NULL,
	"last_name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"phone" varchar(20),
	"date_of_birth" date,
	"address_line1" varchar(255),
	"city" varchar(100),
	"state" varchar(50),
	"zip_code" varchar(10),
	"employment_status" varchar(50),
	"annual_income" numeric(12, 2),
	"kyc_status" varchar(50) DEFAULT 'pending',
	"ssn" varchar(11),
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "borrowers_email_key" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "borrowers" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "payment_schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"loan_id" uuid,
	"payment_number" integer NOT NULL,
	"due_date" date NOT NULL,
	"principal_amount" numeric(10, 2) NOT NULL,
	"interest_amount" numeric(10, 2) NOT NULL,
	"total_amount" numeric(10, 2) NOT NULL,
	"remaining_balance" numeric(12, 2) NOT NULL,
	"status" varchar(50) DEFAULT 'pending',
	"paid_date" date,
	"paid_amount" numeric(10, 2),
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "payment_schedules" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"loan_id" uuid,
	"payment_schedule_id" uuid,
	"amount" numeric(10, 2) NOT NULL,
	"payment_date" date NOT NULL,
	"payment_method" varchar(50),
	"stripe_payment_intent_id" varchar(255),
	"status" varchar(50) DEFAULT 'pending',
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "payments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "loans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"loan_number" varchar(50) NOT NULL,
	"borrower_id" uuid,
	"principal_amount" numeric(12, 2) NOT NULL,
	"interest_rate" numeric(5, 4) NOT NULL,
	"term_months" integer NOT NULL,
	"monthly_payment" numeric(10, 2) NOT NULL,
	"purpose" text,
	"status" varchar(50) DEFAULT 'new',
	"funding_date" date,
	"remaining_balance" numeric(12, 2),
	"docusign_envelope_id" varchar(255),
	"docusign_status" varchar(50) DEFAULT 'not_sent',
	"docusign_status_updated" timestamp with time zone,
	"docusign_completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "loans_loan_number_key" UNIQUE("loan_number"),
	CONSTRAINT "check_positive_amounts" CHECK ((principal_amount > (0)::numeric) AND (interest_rate >= (0)::numeric) AND (term_months > 0) AND (monthly_payment > (0)::numeric))
);
--> statement-breakpoint
ALTER TABLE "loans" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "payment_schedules" ADD CONSTRAINT "payment_schedules_loan_id_fkey" FOREIGN KEY ("loan_id") REFERENCES "public"."loans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_loan_id_fkey" FOREIGN KEY ("loan_id") REFERENCES "public"."loans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_payment_schedule_id_fkey" FOREIGN KEY ("payment_schedule_id") REFERENCES "public"."payment_schedules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loans" ADD CONSTRAINT "loans_borrower_id_fkey" FOREIGN KEY ("borrower_id") REFERENCES "public"."borrowers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_borrowers_email" ON "borrowers" USING btree ("email" text_ops);--> statement-breakpoint
CREATE INDEX "idx_payment_schedules_loan_id" ON "payment_schedules" USING btree ("loan_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_payments_loan_id" ON "payments" USING btree ("loan_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_loans_borrower_id" ON "loans" USING btree ("borrower_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_loans_docusign_envelope_id" ON "loans" USING btree ("docusign_envelope_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_loans_loan_number" ON "loans" USING btree ("loan_number" text_ops);--> statement-breakpoint
CREATE INDEX "idx_loans_status" ON "loans" USING btree ("status" text_ops);--> statement-breakpoint
CREATE POLICY "Enable all operations for service role" ON "borrowers" AS PERMISSIVE FOR ALL TO public USING (true);--> statement-breakpoint
CREATE POLICY "Enable all operations for service role" ON "payment_schedules" AS PERMISSIVE FOR ALL TO public USING (true);--> statement-breakpoint
CREATE POLICY "Enable all operations for service role" ON "payments" AS PERMISSIVE FOR ALL TO public USING (true);--> statement-breakpoint
CREATE POLICY "Enable all operations for service role" ON "loans" AS PERMISSIVE FOR ALL TO public USING (true);
*/