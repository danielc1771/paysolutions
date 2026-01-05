import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { db } from '@/drizzle';
import { loans, borrowers } from '@/drizzle/schema/schema';
import { eq, and, or, sql, notInArray } from 'drizzle-orm';

/**
 * API endpoint to check for duplicate loans by VIN or client information
 * Checks all loan statuses to prevent any duplicates
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { vin, email, phone, firstName, lastName, dateOfBirth, organizationId } = body;

    console.log('🔍 Duplicate check request:', { vin, email, organizationId });

    // Validate required fields
    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      );
    }

    // Build conditions for duplicate checking
    const duplicateConditions = [];

    // Check for duplicate VIN if provided
    if (vin && vin.length === 17) {
      console.log('✅ Adding VIN condition:', vin.toUpperCase());
      console.log('✅ Adding VIN condition:', vin.toUpperCase());
      // Only check for active loans (exclude terminal statuses)
      // Allow VIN reuse if previous loan is closed, settled, defaulted, or derogatory
      const TERMINAL_STATUSES = ['closed', 'settled', 'defaulted', 'derogatory'] as const;

      duplicateConditions.push(
        and(
          eq(loans.vehicleVin, vin.toUpperCase()),
          notInArray(loans.status, TERMINAL_STATUSES as any)
        )
      );
    } else {
      console.log('❌ VIN not valid for checking:', vin);
    }

    // If we have client information, check for duplicate clients
    if (email || phone || (firstName && lastName && dateOfBirth)) {
      // First, find borrowers matching the client criteria
      const borrowerConditions = [];

      if (email) {
        borrowerConditions.push(eq(borrowers.email, email.toLowerCase()));
      }

      if (phone) {
        // Normalize phone number (remove spaces, dashes, etc.)
        const normalizedPhone = phone.replace(/[\s\-\(\)]/g, '');
        borrowerConditions.push(eq(borrowers.phone, normalizedPhone));
      }

      if (firstName && lastName && dateOfBirth) {
        borrowerConditions.push(
          and(
            sql`LOWER(${borrowers.firstName}) = LOWER(${firstName})`,
            sql`LOWER(${borrowers.lastName}) = LOWER(${lastName})`,
            eq(borrowers.dateOfBirth, dateOfBirth)
          )
        );
      }

      // Find matching borrowers
      if (borrowerConditions.length > 0) {
        const matchingBorrowers = await db
          .select({ id: borrowers.id })
          .from(borrowers)
          .where(
            and(
              eq(borrowers.organizationId, organizationId),
              or(...borrowerConditions)
            )
          );

        // If we found matching borrowers, check for their loans
        if (matchingBorrowers.length > 0) {
          const borrowerIds = matchingBorrowers.map((b: { id: string }) => b.id);
          duplicateConditions.push(
            sql`${loans.borrowerId} IN ${borrowerIds}`
          );
        }
      }
    }

    // If no conditions to check, return no duplicates
    if (duplicateConditions.length === 0) {
      console.log('⚠️ No conditions to check, returning no duplicates');
      return NextResponse.json({
        hasDuplicate: false,
        duplicates: [],
      });
    }

    console.log('🔎 Querying for duplicates with', duplicateConditions.length, 'conditions');

    // Query for duplicate loans (check ALL statuses)
    const duplicateLoans = await db
      .select({
        id: loans.id,
        loanNumber: loans.loanNumber,
        status: loans.status,
        vehicleVin: loans.vehicleVin,
        vehicleMake: loans.vehicleMake,
        vehicleModel: loans.vehicleModel,
        vehicleYear: loans.vehicleYear,
        principalAmount: loans.principalAmount,
        createdAt: loans.createdAt,
        borrowerId: loans.borrowerId,
      })
      .from(loans)
      .where(
        and(
          eq(loans.organizationId, organizationId),
          or(...duplicateConditions)
        )
      )
      .limit(10); // Limit to 10 results for performance

    console.log('📊 Found', duplicateLoans.length, 'duplicate loans');
    if (duplicateLoans.length > 0) {
      console.log('Duplicate loans:', duplicateLoans.map(l => ({ loanNumber: l.loanNumber, vin: l.vehicleVin, status: l.status })));
    }

    // Get borrower information for the duplicate loans
    const loansWithBorrowers = await Promise.all(
      duplicateLoans.map(async (loan: typeof duplicateLoans[0]) => {
        if (loan.borrowerId) {
          const borrower = await db
            .select({
              firstName: borrowers.firstName,
              lastName: borrowers.lastName,
              email: borrowers.email,
              phone: borrowers.phone,
            })
            .from(borrowers)
            .where(eq(borrowers.id, loan.borrowerId))
            .limit(1);

          return {
            ...loan,
            borrower: borrower[0] || null,
          };
        }
        return {
          ...loan,
          borrower: null,
        };
      })
    );

    return NextResponse.json({
      hasDuplicate: duplicateLoans.length > 0,
      duplicates: loansWithBorrowers,
      count: duplicateLoans.length,
    });

  } catch (error) {
    console.error('Error checking for duplicate loans:', error);
    return NextResponse.json(
      { error: 'Failed to check for duplicate loans' },
      { status: 500 }
    );
  }
}
