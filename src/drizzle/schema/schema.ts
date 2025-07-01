import { pgTable, index, unique, pgPolicy, uuid, varchar, date, numeric, timestamp, foreignKey, integer, text, check, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"
// import { organization } from "./auth";

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
});

export const roleEnum = pgEnum('role', ['admin', 'user', 'borrower']);
export const profileStatusEnum = pgEnum('profile_status', ['INVITED', 'ACTIVE']);

// This table stores user-specific data, linking them to an organization and a role.
// The `id` column is the primary key and is intended to match the `id` from Supabase's `auth.users` table.
export const profiles = pgTable("profiles", {
	id: uuid('id').primaryKey(), // This ID must correspond to the user's ID in auth.users
	organizationId: uuid('organization_id').references(() => organization.id),
	role: roleEnum('role').default('user'),
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
	termMonths: integer("term_months").notNull(),
	monthlyPayment: numeric("monthly_payment", { precision: 10, scale:  2 }).notNull(),
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
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	organizationId: uuid('organization_id').references(() => organization.id),
	applicationStep: integer("application_step").default(1),
	stripeVerificationSessionId: varchar("stripe_verification_session_id", { length: 255 }),
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
	check("check_positive_amounts", sql`(principal_amount > (0)::numeric) AND (interest_rate >= (0)::numeric) AND (term_months > 0) AND (monthly_payment > (0)::numeric)`),
]);
