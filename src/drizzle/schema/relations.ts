import { relations } from "drizzle-orm/relations";
import { loans, paymentSchedules, payments, borrowers } from "./schema";

export const paymentSchedulesRelations = relations(paymentSchedules, ({one, many}) => ({
	loan: one(loans, {
		fields: [paymentSchedules.loanId],
		references: [loans.id]
	}),
	payments: many(payments),
}));

export const loansRelations = relations(loans, ({one, many}) => ({
	paymentSchedules: many(paymentSchedules),
	payments: many(payments),
	borrower: one(borrowers, {
		fields: [loans.borrowerId],
		references: [borrowers.id]
	}),
}));

export const paymentsRelations = relations(payments, ({one}) => ({
	loan: one(loans, {
		fields: [payments.loanId],
		references: [loans.id]
	}),
	paymentSchedule: one(paymentSchedules, {
		fields: [payments.paymentScheduleId],
		references: [paymentSchedules.id]
	}),
}));

export const borrowersRelations = relations(borrowers, ({many}) => ({
	loans: many(loans),
}));