import 'server-only';
import docusign from 'docusign-esign';

// Extended interfaces for DocuSign features not in the official types
interface ExtendedDocument extends Omit<docusign.Document, 'documentBase64' | 'fileExtension'> {
  documentBase64?: string;
  fileExtension?: string;
  htmlDefinition?: {
    source: string;
  };
}

interface ExtendedSignHere extends Omit<docusign.SignHere, 'pageNumber' | 'xPosition' | 'yPosition'> {
  pageNumber?: string;
  xPosition?: string;
  yPosition?: string;
  anchorString?: string;
  anchorUnits?: string;
  anchorXOffset?: string;
  anchorYOffset?: string;
}

interface ExtendedDateSigned extends Omit<docusign.DateSigned, 'pageNumber' | 'xPosition' | 'yPosition'> {
  pageNumber?: string;
  xPosition?: string;
  yPosition?: string;
  anchorString?: string;
  anchorUnits?: string;
  anchorXOffset?: string;
  anchorYOffset?: string;
}

export interface LoanData {
  loanNumber: string;
  principalAmount: number;
  interestRate: number;
  termWeeks: number;
  weeklyPayment: number;
  purpose: string;
  vehicle?: {
    year: string;
    make: string;
    model: string;
    vin: string;
  };
  borrower: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    addressLine1: string;
    city: string;
    state: string;
    zipCode: string;
    ssn: string;
    dateOfBirth: string;
    employmentStatus: string;
    annualIncome: number;
    currentEmployerName?: string;
    timeWithEmployment?: string;
    reference1Name?: string;
    reference1Phone?: string;
    reference1Email?: string;
    reference2Name?: string;
    reference2Phone?: string;
    reference2Email?: string;
    reference3Name?: string;
    reference3Phone?: string;
    reference3Email?: string;
  };
}

export interface WeeklyPaymentScheduleItem {
  paymentNumber: number;
  dueDate: string;
  principalAmount: number;
  interestAmount: number;
  totalAmount: number;
  remainingBalance: number;
}

// Calculate weekly payment schedule for variable term weeks
export function calculateWeeklyPaymentSchedule(
  principalAmount: number,
  annualInterestRate: number,
  termWeeks: number
): WeeklyPaymentScheduleItem[] {
  const schedule: WeeklyPaymentScheduleItem[] = [];
  const weeklyRate = annualInterestRate / 52; // Convert annual to weekly rate
  
  // Calculate weekly payment using amortization formula
  const weeklyPayment = principalAmount * 
    (weeklyRate * Math.pow(1 + weeklyRate, termWeeks)) /
    (Math.pow(1 + weeklyRate, termWeeks) - 1);
  
  let remainingBalance = principalAmount;
  const startDate = new Date();
  
  for (let i = 1; i <= termWeeks; i++) {
    const paymentDate = new Date(startDate);
    paymentDate.setDate(paymentDate.getDate() + (i * 7)); // Add weeks
    
    const interestPayment = remainingBalance * weeklyRate;
    const principalPayment = weeklyPayment - interestPayment;
    remainingBalance = Math.max(0, remainingBalance - principalPayment);
    
    schedule.push({
      paymentNumber: i,
      dueDate: paymentDate.toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit', 
        year: 'numeric'
      }),
      principalAmount: Math.round(principalPayment * 100) / 100,
      interestAmount: Math.round(interestPayment * 100) / 100,
      totalAmount: Math.round(weeklyPayment * 100) / 100,
      remainingBalance: Math.round(remainingBalance * 100) / 100,
    });
  }
  
  return schedule;
}

// Generate DocuSign-optimized loan agreement document with inline styles
export const generateLoanAgreementHTMLInline = (loanData: LoanData): string => {
  const currentDate = new Date().toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric'
  });
  
  const firstPaymentDate = new Date();
  firstPaymentDate.setDate(firstPaymentDate.getDate() + 7); // First payment due in 7 days
  
  // Calculate weekly payment schedule using actual term weeks
  const paymentSchedule = calculateWeeklyPaymentSchedule(
    loanData.principalAmount,
    loanData.interestRate,
    loanData.termWeeks
  );
  
  const totalFinanceCharge = paymentSchedule.reduce((sum, payment) => sum + payment.interestAmount, 0);
  const totalOfPayments = paymentSchedule.reduce((sum, payment) => sum + payment.totalAmount, 0);

  return `
<!DOCTYPE html>
<html>
<head>
    <title>Vehicle Loan Agreement - ${loanData.loanNumber}</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; margin: 0; padding: 20px; line-height: 1.5; font-size: 14px; color: #333;">

    <!-- Enhanced Document Header -->
    <div style="background-color: #2563eb; color: white; padding: 30px 20px; text-align: center; margin: -20px -20px 30px -20px; border-radius: 0 0 15px 15px;">
        <h1 style="font-size: 28px; font-weight: bold; margin: 0 0 8px 0; letter-spacing: -0.5px;">Vehicle Loan Agreement</h1>
        <p style="font-size: 16px; margin: 0; opacity: 0.9;">PaySolutions LLC - Professional Financing Services</p>
    </div>

    <div style="background-color: #f8fafc; padding: 20px; margin: 20px 0; border-radius: 10px; border: 2px solid #e2e8f0;">
        <h3 style="color: #1e40af; font-size: 18px; font-weight: bold; margin: 0 0 15px 0; padding-bottom: 8px; border-bottom: 2px solid #3b82f6;">📋 Loan Information</h3>
        <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
            <tr>
                <th style="border: 1px solid #d1d5db; padding: 10px; text-align: left; background-color: #3b82f6; color: white; font-weight: bold; font-size: 13px;">Application Date:</th>
                <td style="border: 1px solid #d1d5db; padding: 10px; background-color: white; font-weight: 500;">${currentDate}</td>
                <th style="border: 1px solid #d1d5db; padding: 10px; text-align: left; background-color: #3b82f6; color: white; font-weight: bold; font-size: 13px;">Requested Loan Amount:</th>
                <td style="border: 1px solid #d1d5db; padding: 10px; background-color: white; font-weight: 500;">$${loanData.principalAmount.toLocaleString()}</td>
            </tr>
            <tr>
                <th style="border: 1px solid #d1d5db; padding: 10px; text-align: left; background-color: #3b82f6; color: white; font-weight: bold; font-size: 13px;">Dealership:</th>
                <td colspan="3" style="border: 1px solid #d1d5db; padding: 10px; background-color: white; font-weight: 500;">Pay Solutions</td>
            </tr>
        </table>
        
        ${loanData.vehicle ? `
        <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
            <tr>
                <th style="border: 1px solid #d1d5db; padding: 10px; text-align: left; background-color: #3b82f6; color: white; font-weight: bold; font-size: 13px;">Vehicle Year:</th>
                <td style="border: 1px solid #d1d5db; padding: 10px; background-color: white; font-weight: 500;">${loanData.vehicle.year}</td>
                <th style="border: 1px solid #d1d5db; padding: 10px; text-align: left; background-color: #3b82f6; color: white; font-weight: bold; font-size: 13px;">Make:</th>
                <td style="border: 1px solid #d1d5db; padding: 10px; background-color: white; font-weight: 500;">${loanData.vehicle.make}</td>
            </tr>
            <tr>
                <th style="border: 1px solid #d1d5db; padding: 10px; text-align: left; background-color: #3b82f6; color: white; font-weight: bold; font-size: 13px;">Model:</th>
                <td style="border: 1px solid #d1d5db; padding: 10px; background-color: white; font-weight: 500;">${loanData.vehicle.model}</td>
                <th style="border: 1px solid #d1d5db; padding: 10px; text-align: left; background-color: #3b82f6; color: white; font-weight: bold; font-size: 13px;">VIN:</th>
                <td style="border: 1px solid #d1d5db; padding: 10px; background-color: white; font-weight: 500;">${loanData.vehicle.vin}</td>
            </tr>
        </table>
        ` : ''}
    </div>

    <div style="display: table; width: 100%; margin-bottom: 20px; border-spacing: 10px;">
        <div style="display: table-cell; width: 50%; border: 2px solid #3b82f6; border-radius: 10px; padding: 15px; background-color: #f0f9ff; vertical-align: top;">
            <h4 style="color: #1e40af; font-size: 16px; font-weight: bold; margin: 0 0 12px 0; text-transform: uppercase; letter-spacing: 0.5px;">🏢 Lender Information</h4>
            <strong style="color: #1e40af; font-size: 16px;">Pay Solutions LLC</strong><br>
            575 NW 50th St<br>
            Miami, FL 33166<br>
            <br>
            <strong>Professional Lending Services</strong><br>
            <em>Your trusted financial partner</em>
        </div>
        <div style="display: table-cell; width: 50%; border: 2px solid #3b82f6; border-radius: 10px; padding: 15px; background-color: #f0f9ff; vertical-align: top;">
            <h4 style="color: #1e40af; font-size: 16px; font-weight: bold; margin: 0 0 12px 0; text-transform: uppercase; letter-spacing: 0.5px;">👤 Borrower Information</h4>
            <strong style="color: #1e40af; font-size: 16px;">${loanData.borrower.firstName} ${loanData.borrower.lastName}</strong><br>
            📧 ${loanData.borrower.email}<br>
            ${loanData.borrower.phone ? `📱 ${loanData.borrower.phone}<br>` : ''}
            🎂 Date of Birth: ${loanData.borrower.dateOfBirth}<br>
            <br>
            <strong>📍 Address:</strong><br>
            ${loanData.borrower.addressLine1}<br>
            ${loanData.borrower.city}, ${loanData.borrower.state} ${loanData.borrower.zipCode}<br>
            <br>
            <strong>💼 Employment:</strong><br>
            Status: ${loanData.borrower.employmentStatus}<br>
            Annual Salary: $${loanData.borrower.annualIncome?.toLocaleString()}<br>
            ${loanData.borrower.currentEmployerName ? `Employer: ${loanData.borrower.currentEmployerName}<br>` : ''}
            ${loanData.borrower.timeWithEmployment ? `Time with Employer: ${loanData.borrower.timeWithEmployment}` : ''}
        </div>
    </div>

    ${(loanData.borrower.reference1Name || loanData.borrower.reference2Name) ? `
    <div style="background-color: #f8fafc; padding: 20px; margin: 20px 0; border-radius: 10px; border: 2px solid #e2e8f0;">
        <h3 style="color: #1e40af; font-size: 18px; font-weight: bold; margin: 0 0 15px 0; padding-bottom: 8px; border-bottom: 2px solid #3b82f6;">📞 References</h3>
        <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
            ${loanData.borrower.reference1Name ? `
            <tr>
                <th style="border: 1px solid #d1d5db; padding: 10px; text-align: left; background-color: #3b82f6; color: white; font-weight: bold; font-size: 13px;">Reference 1:</th>
                <td style="border: 1px solid #d1d5db; padding: 10px; background-color: white; font-weight: 500;">${loanData.borrower.reference1Name}</td>
                <th style="border: 1px solid #d1d5db; padding: 10px; text-align: left; background-color: #3b82f6; color: white; font-weight: bold; font-size: 13px;">Phone:</th>
                <td style="border: 1px solid #d1d5db; padding: 10px; background-color: white; font-weight: 500;">${loanData.borrower.reference1Phone || ''}</td>
            </tr>
            ` : ''}
            ${loanData.borrower.reference2Name ? `
            <tr>
                <th style="border: 1px solid #d1d5db; padding: 10px; text-align: left; background-color: #3b82f6; color: white; font-weight: bold; font-size: 13px;">Reference 2:</th>
                <td style="border: 1px solid #d1d5db; padding: 10px; background-color: white; font-weight: 500;">${loanData.borrower.reference2Name}</td>
                <th style="border: 1px solid #d1d5db; padding: 10px; text-align: left; background-color: #3b82f6; color: white; font-weight: bold; font-size: 13px;">Phone:</th>
                <td style="border: 1px solid #d1d5db; padding: 10px; background-color: white; font-weight: 500;">${loanData.borrower.reference2Phone || ''}</td>
            </tr>
            ` : ''}
        </table>
    </div>
    ` : ''}

    <div style="background-color: #f8fafc; padding: 20px; margin: 20px 0; border-radius: 10px; border: 2px solid #e2e8f0;">
        <h3 style="color: #1e40af; font-size: 18px; font-weight: bold; margin: 0 0 15px 0; padding-bottom: 8px; border-bottom: 2px solid #3b82f6;">📄 Personal Financing Agreement ("PFA") - Exhibit "A"</h3>
        <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
            <tr>
                <th style="border: 1px solid #d1d5db; padding: 10px; text-align: left; background-color: #3b82f6; color: white; font-weight: bold; font-size: 13px;">Borrower Name:</th>
                <td style="border: 1px solid #d1d5db; padding: 10px; background-color: white; font-weight: 500;">${loanData.borrower.firstName} ${loanData.borrower.lastName}</td>
                <th style="border: 1px solid #d1d5db; padding: 10px; text-align: left; background-color: #3b82f6; color: white; font-weight: bold; font-size: 13px;">Interest Rate:</th>
                <td style="border: 1px solid #d1d5db; padding: 10px; background-color: white; font-weight: 500;">${(loanData.interestRate * 100).toFixed(2)}%</td>
            </tr>
            <tr>
                <th style="border: 1px solid #d1d5db; padding: 10px; text-align: left; background-color: #3b82f6; color: white; font-weight: bold; font-size: 13px;">Principal Amount:</th>
                <td style="border: 1px solid #d1d5db; padding: 10px; background-color: white; font-weight: 500;">$${loanData.principalAmount.toLocaleString()}</td>
                <th style="border: 1px solid #d1d5db; padding: 10px; text-align: left; background-color: #3b82f6; color: white; font-weight: bold; font-size: 13px;">Issue Date:</th>
                <td style="border: 1px solid #d1d5db; padding: 10px; background-color: white; font-weight: 500;">${currentDate}</td>
            </tr>
            <tr>
                <th style="border: 1px solid #d1d5db; padding: 10px; text-align: left; background-color: #3b82f6; color: white; font-weight: bold; font-size: 13px;">Term (Weeks):</th>
                <td style="border: 1px solid #d1d5db; padding: 10px; background-color: white; font-weight: 500;">${loanData.termWeeks}</td>
                <th style="border: 1px solid #d1d5db; padding: 10px; text-align: left; background-color: #3b82f6; color: white; font-weight: bold; font-size: 13px;">First Payment Date:</th>
                <td style="border: 1px solid #d1d5db; padding: 10px; background-color: white; font-weight: 500;">${firstPaymentDate.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}</td>
            </tr>
        </table>
    </div>

    <!-- Amortization Schedule -->
    <div style="background-color: #f8fafc; padding: 20px; margin: 20px 0; border-radius: 10px; border: 2px solid #e2e8f0;">
        <h3 style="color: #1e40af; font-size: 18px; font-weight: bold; margin: 0 0 15px 0; padding-bottom: 8px; border-bottom: 2px solid #3b82f6;">📊 Weekly Payment Schedule</h3>
        <div style="background-color: #fef3c7; border: 2px solid #f59e0b; border-radius: 8px; padding: 12px; margin: 12px 0; text-align: center;">
            <p style="margin: 0; font-weight: bold; color: #92400e;">Total of ${loanData.termWeeks} Weekly Payments</p>
        </div>
        <table style="width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 12px;">
            <thead>
                <tr>
                    <th style="border: 1px solid #d1d5db; padding: 8px; text-align: center; background-color: #059669; color: white; font-weight: bold; font-size: 11px;">Payment #</th>
                    <th style="border: 1px solid #d1d5db; padding: 8px; text-align: center; background-color: #059669; color: white; font-weight: bold; font-size: 11px;">Due Date</th>
                    <th style="border: 1px solid #d1d5db; padding: 8px; text-align: center; background-color: #059669; color: white; font-weight: bold; font-size: 11px;">Principal</th>
                    <th style="border: 1px solid #d1d5db; padding: 8px; text-align: center; background-color: #059669; color: white; font-weight: bold; font-size: 11px;">Interest</th>
                    <th style="border: 1px solid #d1d5db; padding: 8px; text-align: center; background-color: #059669; color: white; font-weight: bold; font-size: 11px;">Total Payment</th>
                    <th style="border: 1px solid #d1d5db; padding: 8px; text-align: center; background-color: #059669; color: white; font-weight: bold; font-size: 11px;">Remaining Balance</th>
                </tr>
            </thead>
            <tbody>
                ${paymentSchedule.map((payment, index) => `
                <tr style="background-color: ${index % 2 === 0 ? '#ffffff' : '#f8fafc'};">
                    <td style="border: 1px solid #d1d5db; padding: 8px; text-align: center; font-weight: 500;">${payment.paymentNumber}</td>
                    <td style="border: 1px solid #d1d5db; padding: 8px; text-align: center; font-weight: 500;">${payment.dueDate}</td>
                    <td style="border: 1px solid #d1d5db; padding: 8px; text-align: center; font-weight: 500;">$${payment.principalAmount.toFixed(2)}</td>
                    <td style="border: 1px solid #d1d5db; padding: 8px; text-align: center; font-weight: 500;">$${payment.interestAmount.toFixed(2)}</td>
                    <td style="border: 1px solid #d1d5db; padding: 8px; text-align: center; font-weight: 500;">$${payment.totalAmount.toFixed(2)}</td>
                    <td style="border: 1px solid #d1d5db; padding: 8px; text-align: center; font-weight: 500;">$${payment.remainingBalance.toFixed(2)}</td>
                </tr>
                `).join('')}
            </tbody>
        </table>
        
        <div style="background-color: #f0f9ff; border: 2px solid #3b82f6; border-radius: 10px; padding: 15px; margin: 15px 0;">
            <h4 style="color: #1e40af; font-size: 16px; font-weight: bold; margin: 0 0 12px 0; text-align: center;">💰 Financial Summary</h4>
            <table style="width: 100%; border-collapse: collapse; margin: 0;">
                <tr>
                    <th style="border: 1px solid #d1d5db; padding: 10px; text-align: left; background-color: #3b82f6; color: white; font-weight: bold; font-size: 13px;">Principal Amount:</th>
                    <td style="border: 1px solid #d1d5db; padding: 10px; background-color: white; font-weight: bold; color: #1e40af;">$${loanData.principalAmount.toLocaleString()}</td>
                    <th style="border: 1px solid #d1d5db; padding: 10px; text-align: left; background-color: #3b82f6; color: white; font-weight: bold; font-size: 13px;">Finance Charge:</th>
                    <td style="border: 1px solid #d1d5db; padding: 10px; background-color: white; font-weight: bold; color: #dc2626;">$${totalFinanceCharge.toFixed(2)}</td>
                    <th style="border: 1px solid #d1d5db; padding: 10px; text-align: left; background-color: #3b82f6; color: white; font-weight: bold; font-size: 13px;">Total of Payments:</th>
                    <td style="border: 1px solid #d1d5db; padding: 10px; background-color: white; font-weight: bold; color: #059669;">$${totalOfPayments.toFixed(2)}</td>
                </tr>
            </table>
        </div>
    </div>

    <!-- Page Break for Legal Content -->
    <div style="page-break-before: always;"></div>

    <!-- Legal Agreement Content -->
    <div style="background-color: #2563eb; color: white; padding: 30px 20px; text-align: center; margin: -20px -20px 30px -20px; border-radius: 0 0 15px 15px;">
        <h1 style="font-size: 28px; font-weight: bold; margin: 0 0 8px 0; letter-spacing: -0.5px;">Personal Financing Agreement</h1>
        <p style="font-size: 16px; margin: 0; opacity: 0.9;">Pay Solutions LLC - The Simple, Smart Way to Grow</p>
    </div>

    <div style="text-align: justify; margin-bottom: 15px; line-height: 1.5; font-size: 14px;">
        <p><strong>YOU</strong> and <strong>PAY SOLUTIONS LLC</strong> (hereinafter referred to as "PS") are entering into this personal financing agreement (hereinafter referred to as "Agreement" or "PFA" interchangeably) for the purposes of a personal financing contract to partially cover a down payment for a vehicle sold by ${loanData.purpose || 'the dealership'} to you as "Buyer" or "Borrower" (hereinafter interchangeably), and agree as follows:</p>
    </div>

    <div style="background-color: #f8fafc; padding: 20px; margin: 20px 0; border-radius: 10px; border: 2px solid #e2e8f0;">
        <h3 style="color: #1e40af; font-size: 18px; font-weight: bold; margin: 0 0 15px 0; padding-bottom: 8px; border-bottom: 2px solid #3b82f6;">⚖️ Contract Parties</h3>
        <ol style="counter-reset: item; padding-left: 0; margin: 15px 0;">
            <li style="display: block; margin-bottom: 12px; padding-left: 20px; position: relative;"><span style="content: counter(item, lower-alpha) '. '; counter-increment: item; font-weight: bold; color: #1e40af; position: absolute; left: 0;">a.</span><strong>BORROWER</strong> shall mean, an individual ("Borrower"), ${loanData.borrower.firstName} ${loanData.borrower.lastName} with mailing address at ${loanData.borrower.addressLine1}, ${loanData.borrower.city}, ${loanData.borrower.state} ${loanData.borrower.zipCode}.</li>
            <li style="display: block; margin-bottom: 12px; padding-left: 20px; position: relative;"><span style="content: counter(item, lower-alpha) '. '; counter-increment: item; font-weight: bold; color: #1e40af; position: absolute; left: 0;">b.</span><strong>LENDER</strong> shall mean PAY SOLUTIONS LLC ("PS"), a Florida Limited Liability Company at its office at 575 NW 50th St, Miami, FL 33166, its successors, assigns, and any other holder of this PFA.</li>
            <li style="display: block; margin-bottom: 12px; padding-left: 20px; position: relative;"><span style="content: counter(item, lower-alpha) '. '; counter-increment: item; font-weight: bold; color: #1e40af; position: absolute; left: 0;">c.</span><strong>PAYMENT BENEFICIARY</strong> shall mean the dealership or entity from whom the vehicle is being purchased.</li>
        </ol>
    </div>

    <div style="background-color: #f8fafc; padding: 20px; margin: 20px 0; border-radius: 10px; border: 2px solid #e2e8f0;">
        <h3 style="color: #1e40af; font-size: 18px; font-weight: bold; margin: 0 0 15px 0; padding-bottom: 8px; border-bottom: 2px solid #3b82f6;">✅ Borrower's Representations</h3>
        <p>You represent and acknowledge that: <span style="color: white;">\\i1\\</span> (Initial)</p>
        <ol style="counter-reset: item; padding-left: 0; margin: 15px 0;">
            <li style="display: block; margin-bottom: 12px; padding-left: 20px; position: relative;"><span style="content: counter(item, lower-alpha) '. '; counter-increment: item; font-weight: bold; color: #1e40af; position: absolute; left: 0;">a.</span><strong>Legal Age.</strong> You are of legal age and have legal capacity to enter into this Contract.</li>
            <li style="display: block; margin-bottom: 12px; padding-left: 20px; position: relative;"><span style="content: counter(item, lower-alpha) '. '; counter-increment: item; font-weight: bold; color: #1e40af; position: absolute; left: 0;">b.</span><strong>Vehicle Condition.</strong> I have thoroughly inspected, accepted, and approved the motor vehicle in all respects, and I am satisfied with the condition of the vehicle.</li>
            <li style="display: block; margin-bottom: 12px; padding-left: 20px; position: relative;"><span style="content: counter(item, lower-alpha) '. '; counter-increment: item; font-weight: bold; color: #1e40af; position: absolute; left: 0;">c.</span><strong>Separate to Retail Contract.</strong> You represent and understand that this is not an agreement to purchase the vehicle, but rather, an agreement to cover the down payment portion of said vehicle.</li>
            <li style="display: block; margin-bottom: 12px; padding-left: 20px; position: relative;"><span style="content: counter(item, lower-alpha) '. '; counter-increment: item; font-weight: bold; color: #1e40af; position: absolute; left: 0;">d.</span><strong>No Oral Promises.</strong> You agree that this contract shall be controlling over all oral and verbal discussion and negotiations leading up to this contract.</li>
        </ol>
    </div>

    <div style="background-color: #f8fafc; padding: 20px; margin: 20px 0; border-radius: 10px; border: 2px solid #e2e8f0;">
        <h3 style="color: #1e40af; font-size: 18px; font-weight: bold; margin: 0 0 15px 0; padding-bottom: 8px; border-bottom: 2px solid #3b82f6;">💳 Payment Terms</h3>
        <p>Initial to acknowledge: <span style="color: white;">\\i2\\</span></p>
        <ol style="counter-reset: item; padding-left: 0; margin: 15px 0;">
            <li style="display: block; margin-bottom: 12px; padding-left: 20px; position: relative;"><span style="content: counter(item, lower-alpha) '. '; counter-increment: item; font-weight: bold; color: #1e40af; position: absolute; left: 0;">a.</span>For all provisions in this contract, time is of the essence.</li>
            <li style="display: block; margin-bottom: 12px; padding-left: 20px; position: relative;"><span style="content: counter(item, lower-alpha) '. '; counter-increment: item; font-weight: bold; color: #1e40af; position: absolute; left: 0;">b.</span>Principal Amount shall mean $${loanData.principalAmount.toLocaleString()} (US Dollars) that will cover a portion of an initial payment.</li>
            <li style="display: block; margin-bottom: 12px; padding-left: 20px; position: relative;"><span style="content: counter(item, lower-alpha) '. '; counter-increment: item; font-weight: bold; color: #1e40af; position: absolute; left: 0;">c.</span>For VALUE RECEIVED, the Buyer hereby promises to pay to the order of the Lender, the Principal Amount with interest at the annual rate of ${(loanData.interestRate * 100).toFixed(2)}% percent, interest shall be calculated on a 365/365 simple interest basis.</li>
            <li style="display: block; margin-bottom: 12px; padding-left: 20px; position: relative;"><span style="content: counter(item, lower-alpha) '. '; counter-increment: item; font-weight: bold; color: #1e40af; position: absolute; left: 0;">d.</span>All payments shall be received on or before the business day specified in Exhibit "A". If a payment is not received by the end of the business day applicable, an automatic $10.00 flat administrative late fee shall be assessed.</li>
            <li style="display: block; margin-bottom: 12px; padding-left: 20px; position: relative;"><span style="content: counter(item, lower-alpha) '. '; counter-increment: item; font-weight: bold; color: #1e40af; position: absolute; left: 0;">e.</span>All payments shall be received on a Business Day on or before 5:00PM Eastern Time (ET).</li>
            <li style="display: block; margin-bottom: 12px; padding-left: 20px; position: relative;"><span style="content: counter(item, lower-alpha) '. '; counter-increment: item; font-weight: bold; color: #1e40af; position: absolute; left: 0;">f.</span>If payment is returned for any reason, a returned payment fee of $35.00 shall be paid by Borrower upon demand.</li>
            <li style="display: block; margin-bottom: 12px; padding-left: 20px; position: relative;"><span style="content: counter(item, lower-alpha) '. '; counter-increment: item; font-weight: bold; color: #1e40af; position: absolute; left: 0;">g.</span><strong>Card Payment Surcharge.</strong> If a customer makes a payment using a card, a surcharge of 1.8% of the payment amount will be applied.</li>
            <li style="display: block; margin-bottom: 12px; padding-left: 20px; position: relative;"><span style="content: counter(item, lower-alpha) '. '; counter-increment: item; font-weight: bold; color: #1e40af; position: absolute; left: 0;">h.</span>Borrower can request up to two deferment payments to extend for seven (7) days the current payment date. A fee of $20.00 shall be charged.</li>
            <li style="display: block; margin-bottom: 12px; padding-left: 20px; position: relative;"><span style="content: counter(item, lower-alpha) '. '; counter-increment: item; font-weight: bold; color: #1e40af; position: absolute; left: 0;">i.</span><strong>No Prepayment Penalty.</strong> This PFA may be prepaid in whole or in part at any time, without incurring any penalty.</li>
        </ol>
    </div>

    <div style="background-color: #f8fafc; padding: 20px; margin: 20px 0; border-radius: 10px; border: 2px solid #e2e8f0;">
        <h3 style="color: #1e40af; font-size: 18px; font-weight: bold; margin: 0 0 15px 0; padding-bottom: 8px; border-bottom: 2px solid #3b82f6;">⚠️ Default Conditions</h3>
        <p>Initial to acknowledge: <span style="color: white;">\\i3\\</span></p>
        <p>You will be deemed in default if any of the following occurs:</p>
        <ol style="counter-reset: item; padding-left: 0; margin: 15px 0;">
            <li style="display: block; margin-bottom: 12px; padding-left: 20px; position: relative;"><span style="content: counter(item, lower-alpha) '. '; counter-increment: item; font-weight: bold; color: #1e40af; position: absolute; left: 0;">a.</span>You fail to perform any obligation under this Contract.</li>
            <li style="display: block; margin-bottom: 12px; padding-left: 20px; position: relative;"><span style="content: counter(item, lower-alpha) '. '; counter-increment: item; font-weight: bold; color: #1e40af; position: absolute; left: 0;">b.</span>Buyer fails to timely pay as per schedule, or within five (5) days of due date.</li>
            <li style="display: block; margin-bottom: 12px; padding-left: 20px; position: relative;"><span style="content: counter(item, lower-alpha) '. '; counter-increment: item; font-weight: bold; color: #1e40af; position: absolute; left: 0;">c.</span>Any materially false statement(s) is made by Borrower.</li>
            <li style="display: block; margin-bottom: 12px; padding-left: 20px; position: relative;"><span style="content: counter(item, lower-alpha) '. '; counter-increment: item; font-weight: bold; color: #1e40af; position: absolute; left: 0;">d.</span>Any bankruptcy proceeding is begun by or against Borrower.</li>
            <li style="display: block; margin-bottom: 12px; padding-left: 20px; position: relative;"><span style="content: counter(item, lower-alpha) '. '; counter-increment: item; font-weight: bold; color: #1e40af; position: absolute; left: 0;">e.</span>Cancellation or attempted cancellation of this agreement unilaterally by Borrower.</li>
            <li style="display: block; margin-bottom: 12px; padding-left: 20px; position: relative;"><span style="content: counter(item, lower-alpha) '. '; counter-increment: item; font-weight: bold; color: #1e40af; position: absolute; left: 0;">f.</span>Failure to report change of name, address or telephone number with at least thirty (30) days' notice.</li>
        </ol>
    </div>

    <div style="background-color: #f8fafc; padding: 20px; margin: 20px 0; border-radius: 10px; border: 2px solid #e2e8f0;">
        <h3 style="color: #1e40af; font-size: 18px; font-weight: bold; margin: 0 0 15px 0; padding-bottom: 8px; border-bottom: 2px solid #3b82f6;">📋 Additional Agreements</h3>
        <p>Initial to acknowledge: <span style="color: white;">\\i4\\</span></p>
        <ol style="counter-reset: item; padding-left: 0; margin: 15px 0;">
            <li style="display: block; margin-bottom: 12px; padding-left: 20px; position: relative;"><span style="content: counter(item, lower-alpha) '. '; counter-increment: item; font-weight: bold; color: #1e40af; position: absolute; left: 0;">a.</span><strong>GPS/Tracking Device Installation.</strong> Your vehicle could potentially feature a GPS/TRACKING DEVICE and by signing this document you acknowledge and give consent to the device's installation.</li>
            <li style="display: block; margin-bottom: 12px; padding-left: 20px; position: relative;"><span style="content: counter(item, lower-alpha) '. '; counter-increment: item; font-weight: bold; color: #1e40af; position: absolute; left: 0;">b.</span><strong>Waiver of Privacy Rights.</strong> You agree that you have no privacy rights in the tracking of your vehicle for collection and/or repossession purposes.</li>
            <li style="display: block; margin-bottom: 12px; padding-left: 20px; position: relative;"><span style="content: counter(item, lower-alpha) '. '; counter-increment: item; font-weight: bold; color: #1e40af; position: absolute; left: 0;">c.</span><strong>Electronic Communications.</strong> You give permission to contact you via telephone, SMS text messages, emails, or messaging applications.</li>
        </ol>
    </div>

    <div style="text-align: justify; margin-bottom: 15px; line-height: 1.5; font-size: 14px;">
        <p><strong>JURY TRIAL WAIVER.</strong> LENDER AND BORROWER HEREBY KNOWINGLY, VOLUNTARILY AND INTENTIONALLY WAIVE THE RIGHT EITHER MAY HAVE TO A TRIAL BY JURY. <span style="color: white;">\\i5\\</span> (Initial)</p>
    </div>

    <div style="text-align: justify; margin-bottom: 15px; line-height: 1.5; font-size: 14px;">
        <p><strong>ARBITRATION PROVISION:</strong> Any claim or dispute between you and us shall, at your or our election, be resolved by neutral, binding arbitration and not by a court action. (Initial provided separately)</p>
    </div>

    <!-- Signatures Section -->
    <div style="margin-top: 30px; background-color: #f8fafc; padding: 25px; border-radius: 10px; border: 2px solid #e2e8f0;">
        <h3 style="color: #1e40af; font-size: 20px; font-weight: bold; margin: 0 0 15px 0; text-align: center; text-transform: uppercase; letter-spacing: 0.5px;">ACKNOWLEDGMENT AND SIGNATURES</h3>
        <p style="text-align: justify; margin-bottom: 15px; line-height: 1.5; font-size: 14px;">THIS AGREEMENT IS SUBJECT TO AN ARBITRATION AGREEMENT AND A PRESUIT DEMAND NOTICE REQUIREMENT, AS SET FORTH IN THIS AGREEMENT. BY SIGNING BELOW, I ACKNOWLEDGE THAT I HAVE READ AND UNDERSTOOD THE PROVISIONS IN THIS AGREEMENT AND AGREE TO THE TERMS AND CONDITIONS AS SET FORTH THEREIN.</p>
        
        <p style="text-align: justify; margin-bottom: 15px; line-height: 1.5; font-size: 14px;"><strong>I HEREBY SWEAR AND AFFIRM THAT I HAVE READ AND UNDERSTAND THE TERMS OF THIS CONTRACT.</strong> (Initial required above)</p>
        
        <div style="margin-top: 30px;">
            <table style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td style="width: 50%; padding-right: 15px; vertical-align: top;">
                        <p style="font-weight: bold;">Borrower Signature:</p>
                        <div style="border-bottom: 2px solid #000; height: 35px; margin: 15px 0; position: relative;">
                            <span style="color: white; position: absolute; top: 0; left: 0;">\\s1\\</span>
                        </div>
                        <p>Print Name: ${loanData.borrower.firstName} ${loanData.borrower.lastName}</p>
                        <p>Date: <span style="color: white;">\\d1\\</span>_______________</p>
                    </td>
                    <td style="width: 50%; padding-left: 15px; vertical-align: top;">
                        <p style="font-weight: bold;">Dealer Representative:</p>
                        <div style="border-bottom: 2px solid #000; height: 35px; margin: 15px 0;"></div>
                        <p>Print Name: Pay Solutions Admin</p>
                        <p>Date: _______________</p>
                    </td>
                </tr>
            </table>
        </div>
    </div>

</body>
</html>
  `;
};

// Create DocuSign envelope with inline-styled loan agreement
export const createLoanAgreementEnvelopeInline = (loanData: LoanData): docusign.EnvelopeDefinition => {
  const documentHtml = generateLoanAgreementHTMLInline(loanData);
  
  // Use htmlDefinition for responsive HTML documents (best practice)
  const document: ExtendedDocument = {
    htmlDefinition: {
      source: documentHtml
    },
    name: `Vehicle Loan Agreement - ${loanData.loanNumber}`,
    documentId: '1'
  };

  // Create signer
  const signer: docusign.Signer = {
    email: loanData.borrower.email,
    name: `${loanData.borrower.firstName} ${loanData.borrower.lastName}`,
    recipientId: '1',
    routingOrder: '1'
  };

  // Use anchor string positioning (best practice for HTML documents)
  const signHereTab: ExtendedSignHere = {
    documentId: '1',
    recipientId: '1',
    tabLabel: 'BorrowerSignature',
    anchorString: '\\s1\\',
    anchorUnits: 'pixels',
    anchorXOffset: '0',
    anchorYOffset: '0'
  };

  const dateSignedTab: ExtendedDateSigned = {
    documentId: '1',
    recipientId: '1',
    tabLabel: 'DateSigned',
    anchorString: '\\d1\\',
    anchorUnits: 'pixels',
    anchorXOffset: '0',
    anchorYOffset: '0'
  };

  // Add tabs to signer
  signer.tabs = {
    signHereTabs: [signHereTab as docusign.SignHere],
    dateSignedTabs: [dateSignedTab as docusign.DateSigned]
  };

  // Create envelope definition
  const envelopeDefinition: docusign.EnvelopeDefinition = {
    emailSubject: `Vehicle Loan Agreement - ${loanData.loanNumber} - Signature Required`,
    documents: [document as docusign.Document],
    recipients: {
      signers: [signer]
    },
    status: 'sent'
  };

  return envelopeDefinition;
};