import { pgTable, index, unique, pgPolicy, uuid, varchar, date, numeric, timestamp, foreignKey, integer, text, check, pgEnum, boolean } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"
// import { organization } from "./auth";

// Enum declarations first
export const roleEnum = pgEnum('role', ['admin', 'organization_owner', 'team_member', 'borrower', 'user']);
export const profileStatusEnum = pgEnum('profile_status', ['INVITED', 'ACTIVE']);
export const subscriptionStatusEnum = pgEnum('subscription_status', ['trial', 'active', 'suspended', 'cancelled']);
export const stripeVerificationStatusEnum = pgEnum('stripe_verification_status', ['pending', 'requires_action', 'verified', 'canceled', 'unverified', 'processing', 'completed']);
export const phoneVerificationStatusEnum = pgEnum('phone_verification_status', ['pending', 'sent', 'verified', 'failed', 'expired']);

export const organization = pgTable("organizations", {
	id: uuid("id").defaultRandom().primaryKey(),
	name: varchar("name", { length: 255 }).notNull(),
	createdAt: timestamp("created_at").defaultNow(),
	updatedAt: timestamp("updated_at").defaultNow(),
	email: varchar("email", { length: 255 }),
	phone: varchar("phone", { length: 255 }),
	address: varchar("address", { length: 255 }),
	city: varchar("city", { length: 255 }),
	state: varchar("state", { length: 255 }),
	zipCode: varchar("zip_code", { length: 10 }),
	website: varchar("website", { length: 255 }),
	description: text("description"),
	contactPerson: varchar("contact_person", { length: 255 }),
	taxId: varchar("tax_id", { length: 255 }),
	subscriptionStatus: subscriptionStatusEnum('subscription_status').default('trial'),
	subscriptionStartDate: timestamp("subscription_start_date"),
	subscriptionEndDate: timestamp("subscription_end_date"),
	monthlyLoanLimit: integer("monthly_loan_limit").default(100),
	totalUsersLimit: integer("total_users_limit").default(10),
	isActive: boolean("is_active").default(true),
});

// This table stores user-specific data, linking them to an organization and a role.
// The `id` column is the primary key and is intended to match the `id` from Supabase's `auth.users` table.
export const profiles = pgTable("profiles", {
	id: uuid('id').primaryKey(), // This ID must correspond to the user's ID in auth.users
	organizationId: uuid('organization_id').references(() => organization.id),
	role: roleEnum('role').default('team_member'),
	fullName: varchar("full_name", { length: 255 }),
	email: varchar("email", { length: 255 }),
	status: profileStatusEnum('status').default('INVITED'),
});

export const borrowers = pgTable("borrowers", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	firstName: varchar("first_name", { length: 255 }).notNull(),
	lastName: varchar("last_name", { length: 255 }).notNull(),
	email: varchar({ length: 255 }),
	phone: varchar({ length: 20 }),
	dateOfBirth: date("date_of_birth"),
	addressLine1: varchar("address_line1", { length: 255 }),
	city: varchar({ length: 100 }),
	state: varchar({ length: 50 }),
	zipCode: varchar("zip_code", { length: 10 }),
	employmentStatus: varchar("employment_status", { length: 50 }),
	annualIncome: numeric("annual_income", { precision: 12, scale:  2 }),
	currentEmployerName: varchar("current_employer_name", { length: 255 }),
	timeWithEmployment: varchar("time_with_employment", { length: 50 }),
	kycStatus: varchar("kyc_status", { length: 50 }).default('pending'),
	reference1Name: varchar("reference1_name", { length: 255 }),
	reference1Phone: varchar("reference1_phone", { length: 20 }),
	reference1Email: varchar("reference1_email", { length: 255 }),
	reference2Name: varchar("reference2_name", { length: 255 }),
	reference2Phone: varchar("reference2_phone", { length: 20 }),
	reference2Email: varchar("reference2_email", { length: 255 }),
	reference3Name: varchar("reference3_name", { length: 255 }),
	reference3Phone: varchar("reference3_phone", { length: 20 }),
	reference3Email: varchar("reference3_email", { length: 255 }),
	communicationConsent: text("communication_consent"), // JSON field for consent preferences
	stripeCustomerId: varchar("stripe_customer_id", { length: 255 }), // Stripe customer ID for billing
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	organizationId: uuid('organization_id').references(() => organization.id),
}, (table) => [
	index("idx_borrowers_email").using("btree", table.email.asc().nullsLast().op("text_ops")),
	unique("borrowers_email_key").on(table.email),
	pgPolicy("Enable all operations for service role", { as: "permissive", for: "all", to: ["public"], using: sql`true` }),
]);

export const paymentSchedules = pgTable("payment_schedules", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	loanId: uuid("loan_id"),
	paymentNumber: integer("payment_number").notNull(),
	dueDate: date("due_date").notNull(),
	principalAmount: numeric("principal_amount", { precision: 10, scale:  2 }).notNull(),
	interestAmount: numeric("interest_amount", { precision: 10, scale:  2 }).notNull(),
	totalAmount: numeric("total_amount", { precision: 10, scale:  2 }).notNull(),
	remainingBalance: numeric("remaining_balance", { precision: 12, scale:  2 }).notNull(),
	status: varchar({ length: 50 }).default('pending'),
	paidDate: date("paid_date"),
	paidAmount: numeric("paid_amount", { precision: 10, scale:  2 }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_payment_schedules_loan_id").using("btree", table.loanId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.loanId],
			foreignColumns: [loans.id],
			name: "payment_schedules_loan_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("Enable all operations for service role", { as: "permissive", for: "all", to: ["public"], using: sql`true` }),
]);

export const payments = pgTable("payments", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	loanId: uuid("loan_id"),
	paymentScheduleId: uuid("payment_schedule_id"),
	amount: numeric({ precision: 10, scale:  2 }).notNull(),
	paymentDate: date("payment_date").notNull(),
	paymentMethod: varchar("payment_method", { length: 50 }),
	stripePaymentIntentId: varchar("stripe_payment_intent_id", { length: 255 }),
	status: varchar({ length: 50 }).default('pending'),
	notes: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_payments_loan_id").using("btree", table.loanId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.loanId],
			foreignColumns: [loans.id],
			name: "payments_loan_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.paymentScheduleId],
			foreignColumns: [paymentSchedules.id],
			name: "payments_payment_schedule_id_fkey"
		}),
	pgPolicy("Enable all operations for service role", { as: "permissive", for: "all", to: ["public"], using: sql`true` }),
]);

export const loans = pgTable("loans", { // Added vehicle fields
	id: uuid().defaultRandom().primaryKey().notNull(),
	loanNumber: varchar("loan_number", { length: 50 }).notNull(),
	borrowerId: uuid("borrower_id"),
	principalAmount: numeric("principal_amount", { precision: 12, scale:  2 }).notNull(),
	interestRate: numeric("interest_rate", { precision: 5, scale:  4 }).notNull(),
	termWeeks: integer("term_weeks").notNull(),
	weeklyPayment: numeric("weekly_payment", { precision: 10, scale:  2 }).notNull(),
	purpose: text(),
	status: varchar({ length: 50 }).default('new'),
	fundingDate: date("funding_date"),
	remainingBalance: numeric("remaining_balance", { precision: 12, scale:  2 }),
	docusignEnvelopeId: varchar("docusign_envelope_id", { length: 255 }),
	docusignStatus: varchar("docusign_status", { length: 50 }).default('not_sent'),
	docusignStatusUpdated: timestamp("docusign_status_updated", { withTimezone: true, mode: 'string' }),
	docusignCompletedAt: timestamp("docusign_completed_at", { withTimezone: true, mode: 'string' }),
	vehicleYear: varchar("vehicle_year", { length: 4 }).notNull(),
	vehicleMake: varchar("vehicle_make", { length: 255 }).notNull(),
	vehicleModel: varchar("vehicle_model", { length: 255 }).notNull(),
	vehicleVin: varchar("vehicle_vin", { length: 17 }).notNull(),
	customerFirstName: varchar("customer_first_name", { length: 255 }), // Customer name used for this specific loan
	customerLastName: varchar("customer_last_name", { length: 255 }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	organizationId: uuid('organization_id').references(() => organization.id),
	applicationStep: integer("application_step").default(1),
	stripeVerificationSessionId: varchar("stripe_verification_session_id", { length: 255 }),
	stripeVerificationStatus: stripeVerificationStatusEnum('stripe_verification_status').default('pending'),
	phoneVerificationSessionId: varchar("phone_verification_session_id", { length: 255 }),
	phoneVerificationStatus: phoneVerificationStatusEnum('phone_verification_status').default('pending'),
	verifiedPhoneNumber: varchar("verified_phone_number", { length: 20 }),
	stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 }), // Stripe subscription for recurring payments
	stripeProductId: varchar("stripe_product_id", { length: 255 }), // Stripe product for the loan
	stripePriceId: varchar("stripe_price_id", { length: 255 }), // Stripe price for weekly payments
}, (table) => [
	index("idx_loans_borrower_id").using("btree", table.borrowerId.asc().nullsLast().op("uuid_ops")),
	index("idx_loans_docusign_envelope_id").using("btree", table.docusignEnvelopeId.asc().nullsLast().op("text_ops")),
	index("idx_loans_loan_number").using("btree", table.loanNumber.asc().nullsLast().op("text_ops")),
	index("idx_loans_status").using("btree", table.status.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.borrowerId],
			foreignColumns: [borrowers.id],
			name: "loans_borrower_id_fkey"
		}).onDelete("cascade"),
	unique("loans_loan_number_key").on(table.loanNumber),
	pgPolicy("Enable all operations for service role", { as: "permissive", for: "all", to: ["public"], using: sql`true` }),
	check("check_positive_amounts", sql`(principal_amount > (0)::numeric) AND (interest_rate >= (0)::numeric) AND (term_weeks > 0) AND (weekly_payment > (0)::numeric)`),
]);

export const organizationSettings = pgTable("organization_settings", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	organizationId: uuid("organization_id").references(() => organization.id).notNull(),
	allowTeamMemberInvites: boolean("allow_team_member_invites").default(true),
	allowBorrowerSelfRegistration: boolean("allow_borrower_self_registration").default(false),
	maxLoanAmount: numeric("max_loan_amount", { precision: 12, scale: 2 }).default('25000.00'),
	minLoanAmount: numeric("min_loan_amount", { precision: 12, scale: 2 }).default('1000.00'),
	defaultInterestRate: numeric("default_interest_rate", { precision: 5, scale: 4 }).default('8.9900'),
	requireDocuSignForAllLoans: boolean("require_docusign_for_all_loans").default(true),
	allowExtraPayments: boolean("allow_extra_payments").default(true),
	notificationsEnabled: boolean("notifications_enabled").default(true),
	logoUrl: varchar("logo_url", { length: 255 }),
	colorTheme: varchar("color_theme", { length: 50 }).default('default'),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	unique("organization_settings_organization_id_key").on(table.organizationId),
	foreignKey({
		columns: [table.organizationId],
		foreignColumns: [organization.id],
		name: "organization_settings_organization_id_fkey"
	}).onDelete("cascade"),
	pgPolicy("Enable all operations for service role", { as: "permissive", for: "all", to: ["public"], using: sql`true` }),
]);
