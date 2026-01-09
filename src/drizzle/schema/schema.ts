import { pgTable, index, unique, pgPolicy, uuid, varchar, date, numeric, timestamp, foreignKey, integer, text, check, pgEnum, boolean, json } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"
// import { organization } from "./auth";

// Enum declarations first
export const roleEnum = pgEnum('role', ['admin', 'organization_owner', 'team_member', 'borrower', 'user']);
export const profileStatusEnum = pgEnum('profile_status', ['INVITED', 'ACTIVE']);
export const subscriptionStatusEnum = pgEnum('subscription_status', ['trial', 'active', 'suspended', 'cancelled']);
export const stripeVerificationStatusEnum = pgEnum('stripe_verification_status', ['pending', 'requires_action', 'verified', 'canceled', 'unverified', 'processing', 'completed']);
export const phoneVerificationStatusEnum = pgEnum('phone_verification_status', ['pending', 'sent', 'verified', 'failed', 'expired']);
export const loanStatusEnum = pgEnum('loan_status', [
	'new',
	'application_sent',
	'application_in_progress',
	'application_completed',
	'pending_ipay_signature',
	'pending_org_signature',
	'pending_borrower_signature',
	'ipay_approved',
	'dealer_approved',
	'fully_signed',
	'review',
	'approved',
	'funded',
	'active',
	'pending_derogatory_review',
	'derogatory',
	'settled',
	'closed',
	'defaulted'
]);

export const derogatoryTypeEnum = pgEnum('derogatory_type', ['manual', 'automatic']);
export const verificationStatusEnum = pgEnum('verification_status', [
	'pending',
	'email_sent',
	'in_progress',
	'identity_verified',
	'phone_verified',
	'completed',
	'failed',
	'expired'
]);

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
	dealerLicenseNumber: varchar("dealer_license_number", { length: 100 }),
	einNumber: varchar("ein_number", { length: 20 }),
	subscriptionStatus: subscriptionStatusEnum('subscription_status').default('trial'),
	subscriptionStartDate: timestamp("subscription_start_date"),
	subscriptionEndDate: timestamp("subscription_end_date"),
	monthlyLoanLimit: integer("monthly_loan_limit").default(100),
	totalUsersLimit: integer("total_users_limit").default(10),
	isActive: boolean("is_active").default(true),
	missedPaymentThreshold: integer("missed_payment_threshold").default(2),
	stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),
	// Verification billing fields
	stripeVerificationSubscriptionId: varchar("stripe_verification_subscription_id", { length: 255 }),
	stripeVerificationSubscriptionItemId: varchar("stripe_verification_subscription_item_id", { length: 255 }),
	stripeVerificationPriceId: varchar("stripe_verification_price_id", { length: 255 }),
	verificationBillingStatus: varchar("verification_billing_status", { length: 50 }).default('inactive'),
});

// This table stores user-specific data, linking them to an organization and a role.
// The `id` column is the primary key and is intended to match the `id` from Supabase's `auth.users` table.
export const profiles = pgTable("profiles", {
	id: uuid('id').primaryKey(), // This ID must correspond to the user's ID in auth.users
	organizationId: uuid('organization_id').references(() => organization.id),
	role: roleEnum('role').default('team_member'),
	fullName: varchar("full_name", { length: 255 }),
	email: varchar("email", { length: 255 }),
	cellPhone: varchar("cell_phone", { length: 20 }),
	status: profileStatusEnum('status').default('INVITED'),
});

export const borrowers = pgTable("borrowers", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	firstName: varchar("first_name", { length: 255 }).notNull(),
	lastName: varchar("last_name", { length: 255 }).notNull(),
	email: varchar({ length: 255 }),
	phone: varchar({ length: 20 }),
	dateOfBirth: date("date_of_birth"),
	address: varchar("address", { length: 255 }), // Alias for addressLine1 for DocuSign compatibility
	addressLine1: varchar("address_line1", { length: 255 }),
	city: varchar({ length: 100 }),
	state: varchar({ length: 50 }),
	zipCode: varchar("zip_code", { length: 10 }),
	country: varchar("country", { length: 2 }).default('US'), // ISO country code
	employmentStatus: varchar("employment_status", { length: 50 }),
	annualIncome: numeric("annual_income", { precision: 12, scale: 2 }),
	currentEmployerName: varchar("current_employer_name", { length: 255 }),
	employerState: varchar("employer_state", { length: 50 }), // State where employer is located
	timeWithEmployment: varchar("time_with_employment", { length: 50 }),
	kycStatus: varchar("kyc_status", { length: 50 }).default('pending'),
	preferredLanguage: varchar("preferred_language", { length: 10 }).default('en'),
	reference1Name: varchar("reference1_name", { length: 255 }),
	reference1Phone: varchar("reference1_phone", { length: 20 }),
	reference1Email: varchar("reference1_email", { length: 255 }),
	reference1CountryCode: varchar("reference1_country_code", { length: 5 }).default('+1'), // Phone country code
	reference2Name: varchar("reference2_name", { length: 255 }),
	reference2Phone: varchar("reference2_phone", { length: 20 }),
	reference2Email: varchar("reference2_email", { length: 255 }),
	reference2CountryCode: varchar("reference2_country_code", { length: 5 }).default('+1'), // Phone country code
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
	principalAmount: numeric("principal_amount", { precision: 10, scale: 2 }).notNull(),
	interestAmount: numeric("interest_amount", { precision: 10, scale: 2 }).notNull(),
	totalAmount: numeric("total_amount", { precision: 10, scale: 2 }).notNull(),
	remainingBalance: numeric("remaining_balance", { precision: 12, scale: 2 }).notNull(),
	status: varchar({ length: 50 }).default('pending'),
	paidDate: date("paid_date"),
	paidAmount: numeric("paid_amount", { precision: 10, scale: 2 }),
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
	amount: numeric({ precision: 10, scale: 2 }).notNull(),
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
	principalAmount: numeric("principal_amount", { precision: 12, scale: 2 }).notNull(),
	amount: numeric("amount", { precision: 12, scale: 2 }), // Alias for principalAmount for DocuSign compatibility
	interestRate: numeric("interest_rate", { precision: 5, scale: 4 }).notNull(),
	termWeeks: integer("term_weeks").notNull(),
	termMonths: integer("term_months"), // Term in months for display/DocuSign
	weeklyPayment: numeric("weekly_payment", { precision: 10, scale: 2 }).notNull(),
	monthlyPayment: numeric("monthly_payment", { precision: 10, scale: 2 }), // Monthly payment for display/DocuSign
	loanType: varchar("loan_type", { length: 100 }), // Type of loan (Auto, Personal, etc.)
	purpose: text(),
	status: loanStatusEnum('status').default('new'),
	fundingDate: date("funding_date"),
	remainingBalance: numeric("remaining_balance", { precision: 12, scale: 2 }),
	docusignEnvelopeId: varchar("docusign_envelope_id", { length: 255 }),
	docusignCompletedAt: timestamp("docusign_completed_at", { withTimezone: true, mode: 'string' }),
	// DocuSign signer emails (stored for reference)
	docusignIpayEmail: varchar("docusign_ipay_email", { length: 255 }),
	docusignOrgEmail: varchar("docusign_org_email", { length: 255 }),
	docusignOrgName: varchar("docusign_org_name", { length: 255 }),
	docusignBorrowerEmail: varchar("docusign_borrower_email", { length: 255 }),
	// Signing URL cache for embedded signing flow (24-hour validity)
	ipaySigningUrl: text("ipay_signing_url"),
	organizationSigningUrl: text("organization_signing_url"),
	borrowerSigningUrl: text("borrower_signing_url"),
	signingUrlsGeneratedAt: timestamp("signing_urls_generated_at", { withTimezone: true, mode: 'string' }),
	// Signature timestamps (single source of truth for signer status)
	ipaySignedAt: timestamp("ipay_signed_at", { withTimezone: true, mode: 'string' }),
	organizationSignedAt: timestamp("organization_signed_at", { withTimezone: true, mode: 'string' }),
	borrowerSignedAt: timestamp("borrower_signed_at", { withTimezone: true, mode: 'string' }),
	vehicleYear: varchar("vehicle_year", { length: 4 }).notNull(),
	vehicleMake: varchar("vehicle_make", { length: 255 }).notNull(),
	vehicleModel: varchar("vehicle_model", { length: 255 }).notNull(),
	vehicleVin: varchar("vehicle_vin", { length: 17 }).notNull(),
	customerFirstName: varchar("customer_first_name", { length: 255 }), // Customer name used for this specific loan
	customerLastName: varchar("customer_last_name", { length: 255 }),
	createdBy: uuid("created_by").references(() => profiles.id), // Team member who created the loan
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
	// Derogatory account fields
	derogatoryStatus: boolean("derogatory_status").default(false),
	derogatoryReason: text("derogatory_reason"),
	derogatoryDate: timestamp("derogatory_date", { withTimezone: true, mode: 'string' }),
	derogatoryMarkedBy: uuid("derogatory_marked_by").references(() => profiles.id),
	derogatoryType: derogatoryTypeEnum('derogatory_type'),
	// Loan closure fields
	closureReason: text("closure_reason"),
	closureDate: timestamp("closure_date", { withTimezone: true, mode: 'string' }),
	closedBy: uuid("closed_by").references(() => profiles.id),
	// Late payment tracking
	isLate: boolean("is_late").default(false),
	daysOverdue: integer("days_overdue").default(0),
	lastPaymentCheck: timestamp("last_payment_check", { withTimezone: true, mode: 'string' }),
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
	enableLoans: boolean("enable_loans").default(true),
	enableStandaloneVerifications: boolean("enable_standalone_verifications").default(false),
	verificationsRequirePhone: boolean("verifications_require_phone").default(true),
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

export const borrowerNotes = pgTable("borrower_notes", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	borrowerId: uuid("borrower_id").references(() => borrowers.id).notNull(),
	organizationId: uuid("organization_id").references(() => organization.id).notNull(),
	createdBy: uuid("created_by").references(() => profiles.id).notNull(),
	note: text("note").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_borrower_notes_borrower_id").using("btree", table.borrowerId.asc().nullsLast().op("uuid_ops")),
	index("idx_borrower_notes_organization_id").using("btree", table.organizationId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
		columns: [table.borrowerId],
		foreignColumns: [borrowers.id],
		name: "borrower_notes_borrower_id_fkey"
	}).onDelete("cascade"),
	foreignKey({
		columns: [table.organizationId],
		foreignColumns: [organization.id],
		name: "borrower_notes_organization_id_fkey"
	}).onDelete("cascade"),
	foreignKey({
		columns: [table.createdBy],
		foreignColumns: [profiles.id],
		name: "borrower_notes_created_by_fkey"
	}).onDelete("cascade"),
	pgPolicy("Enable all operations for service role", { as: "permissive", for: "all", to: ["public"], using: sql`true` }),
]);

export const verifications = pgTable("verifications", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	organizationId: uuid("organization_id").references(() => organization.id).notNull(),
	createdBy: uuid("created_by").references(() => profiles.id),

	// Person Information
	firstName: varchar("first_name", { length: 255 }).notNull(),
	lastName: varchar("last_name", { length: 255 }).notNull(),
	email: varchar("email", { length: 255 }).notNull(),
	phone: varchar("phone", { length: 20 }),
	dateOfBirth: date("date_of_birth"),

	// Address (captured during verification)
	address: varchar("address", { length: 255 }),
	city: varchar("city", { length: 100 }),
	state: varchar("state", { length: 50 }),
	zipCode: varchar("zip_code", { length: 10 }),
	country: varchar("country", { length: 2 }).default('US'),

	// Stripe Identity Verification
	stripeVerificationSessionId: varchar("stripe_verification_session_id", { length: 255 }),
	stripeVerificationStatus: stripeVerificationStatusEnum('stripe_verification_status').default('pending'),
	stripeVerifiedAt: timestamp("stripe_verified_at", { withTimezone: true, mode: 'string' }),
	stripeVerificationUrl: text("stripe_verification_url"),

	// Phone Verification (Twilio)
	phoneVerificationSessionId: varchar("phone_verification_session_id", { length: 255 }),
	phoneVerificationStatus: phoneVerificationStatusEnum('phone_verification_status').default('pending'),
	verifiedPhoneNumber: varchar("verified_phone_number", { length: 20 }),
	phoneVerifiedAt: timestamp("phone_verified_at", { withTimezone: true, mode: 'string' }),

	// Verification Results (from Stripe)
	verificationResultData: text("verification_result_data"), // JSON field with full Stripe response
	documentType: varchar("document_type", { length: 50 }), // e.g., "passport", "driving_license", "id_card"

	// Status and Metadata
	status: verificationStatusEnum('status').default('pending'),
	purpose: text("purpose"), // Optional: why this verification was requested
	verificationToken: varchar("verification_token", { length: 255 }), // Unique token for public access link
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }),
	completedAt: timestamp("completed_at", { withTimezone: true, mode: 'string' }),

	// Email tracking
	emailSentAt: timestamp("email_sent_at", { withTimezone: true, mode: 'string' }),
	emailSentCount: integer("email_sent_count").default(0),

	// Audit
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_verifications_organization_id").using("btree", table.organizationId.asc().nullsLast().op("uuid_ops")),
	index("idx_verifications_email").using("btree", table.email.asc().nullsLast().op("text_ops")),
	index("idx_verifications_status").using("btree", table.status.asc().nullsLast()),
	index("idx_verifications_created_at").using("btree", table.createdAt.desc().nullsLast()),
	index("idx_verifications_token").using("btree", table.verificationToken.asc().nullsLast().op("text_ops")),
	unique("verifications_verification_token_key").on(table.verificationToken),
	foreignKey({
		columns: [table.organizationId],
		foreignColumns: [organization.id],
		name: "verifications_organization_id_fkey"
	}).onDelete("cascade"),
	foreignKey({
		columns: [table.createdBy],
		foreignColumns: [profiles.id],
		name: "verifications_created_by_fkey"
	}).onDelete("set null"),
	pgPolicy("Enable all operations for service role", { as: "permissive", for: "all", to: ["public"], using: sql`true` }),
]);

// Verification usage tracking for metered billing
export const verificationUsage = pgTable("verification_usage", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	organizationId: uuid("organization_id").references(() => organization.id).notNull(),
	verificationId: uuid("verification_id").references(() => verifications.id).notNull(),

	// Stripe usage record tracking
	stripeUsageRecordId: varchar("stripe_usage_record_id", { length: 255 }),
	reportedAt: timestamp("reported_at", { withTimezone: true, mode: 'string' }),

	// Usage metadata
	quantity: integer("quantity").default(1),
	billingPeriodStart: timestamp("billing_period_start", { withTimezone: true, mode: 'string' }),
	billingPeriodEnd: timestamp("billing_period_end", { withTimezone: true, mode: 'string' }),

	// Audit
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_verification_usage_organization_id").using("btree", table.organizationId.asc().nullsLast().op("uuid_ops")),
	index("idx_verification_usage_reported_at").using("btree", table.reportedAt.desc().nullsLast()),
	unique("verification_usage_verification_id_key").on(table.verificationId),
	foreignKey({
		columns: [table.organizationId],
		foreignColumns: [organization.id],
		name: "verification_usage_organization_id_fkey"
	}).onDelete("cascade"),
	foreignKey({
		columns: [table.verificationId],
		foreignColumns: [verifications.id],
		name: "verification_usage_verification_id_fkey"
	}).onDelete("cascade"),
	pgPolicy("Enable all operations for service role", { as: "permissive", for: "all", to: ["public"], using: sql`true` }),
]);
