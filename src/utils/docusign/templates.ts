import 'server-only';
import docusign from 'docusign-esign';
import { LoanForDocuSign } from '@/types/loan';

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

// ExtendedInitialHere interface removed due to TypeScript limitations
// Initial tabs will be handled separately when needed

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

// Generate comprehensive loan agreement document content with inline styles for DocuSign compatibility
export const generateLoanAgreementHTML = (loanData: LoanForDocuSign): string => {
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
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            margin: 0;
            padding: 30px;
            line-height: 1.6;
            font-size: 14px;
            color: #1f2937;
            background-color: #ffffff;
        }
        .page-break { page-break-before: always; }
        .document-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px 30px;
            text-align: center;
            margin: -30px -30px 40px -30px;
            border-radius: 0 0 20px 20px;
        }
        .document-header h1 {
            font-size: 32px;
            font-weight: 700;
            margin: 0 0 10px 0;
            letter-spacing: -0.5px;
        }
        .document-header p {
            font-size: 16px;
            margin: 0;
            opacity: 0.9;
        }
        .header { text-align: center; margin-bottom: 30px; }
        .section { 
            margin-bottom: 30px;
            background: #f8fafc;
            padding: 25px;
            border-radius: 12px;
            border: 1px solid #e2e8f0;
        }
        .section h3 {
            color: #1e40af;
            font-size: 20px;
            font-weight: 600;
            margin: 0 0 20px 0;
            padding-bottom: 10px;
            border-bottom: 2px solid #3b82f6;
        }
        .contact-info { 
            display: flex; 
            justify-content: space-between; 
            margin-bottom: 30px;
            gap: 20px;
        }
        .contact-box { 
            border: 2px solid #3b82f6;
            border-radius: 12px;
            padding: 20px;
            width: 48%;
            min-height: 120px;
            background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
        }
        .contact-box h4 {
            color: #1e40af;
            font-size: 16px;
            font-weight: 600;
            margin: 0 0 15px 0;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .loan-info-table { 
            width: 100%; 
            border-collapse: collapse; 
            margin: 20px 0;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            border-radius: 8px;
            overflow: hidden;
        }
        .loan-info-table th, .loan-info-table td { 
            border: 1px solid #d1d5db;
            padding: 12px 15px;
            text-align: left;
        }
        .loan-info-table th { 
            background: linear-gradient(135deg, #3b82f6 0%, #1e40af 100%);
            color: white;
            font-weight: 600;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .loan-info-table td {
            background-color: #ffffff;
            font-weight: 500;
        }
        .schedule-table { 
            width: 100%; 
            border-collapse: collapse; 
            margin: 20px 0;
            font-size: 12px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            border-radius: 8px;
            overflow: hidden;
        }
        .schedule-table th, .schedule-table td { 
            border: 1px solid #d1d5db;
            padding: 10px 8px;
            text-align: center;
        }
        .schedule-table th { 
            background: linear-gradient(135deg, #059669 0%, #047857 100%);
            color: white;
            font-weight: 600;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.3px;
        }
        .schedule-table td {
            background-color: #ffffff;
            font-weight: 500;
        }
        .schedule-table tr:nth-child(even) td {
            background-color: #f8fafc;
        }
        .legal-text { 
            text-align: justify; 
            margin-bottom: 20px; 
            line-height: 1.6;
            font-size: 14px;
        }
        .signature-section { 
            margin-top: 40px;
            page-break-inside: avoid;
            background: #f8fafc;
            padding: 30px;
            border-radius: 12px;
            border: 2px solid #e2e8f0;
        }
        .signature-section h3 {
            color: #1e40af;
            font-size: 22px;
            font-weight: 600;
            margin: 0 0 20px 0;
            text-align: center;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .initial-box {
            display: inline-block;
            border: 2px solid #3b82f6;
            width: 35px;
            height: 25px;
            margin: 0 8px;
            vertical-align: middle;
            border-radius: 4px;
            background-color: #f0f9ff;
        }
        ol { 
            counter-reset: item; 
            padding-left: 0;
            margin: 20px 0;
        }
        ol > li { 
            display: block; 
            margin-bottom: 15px;
            padding-left: 25px;
            position: relative;
        }
        ol > li:before { 
            content: counter(item, lower-alpha) ". "; 
            counter-increment: item; 
            font-weight: 700;
            color: #1e40af;
            position: absolute;
            left: 0;
        }
        .financial-summary {
            background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
            border: 2px solid #3b82f6;
            border-radius: 12px;
            padding: 20px;
            margin: 20px 0;
        }
        .financial-summary h4 {
            color: #1e40af;
            font-size: 18px;
            font-weight: 600;
            margin: 0 0 15px 0;
            text-align: center;
        }
        .highlight-box {
            background: linear-gradient(135deg, #fef3c7 0%, #fed7aa 100%);
            border: 2px solid #f59e0b;
            border-radius: 8px;
            padding: 15px;
            margin: 15px 0;
            text-align: center;
        }
        .highlight-box p {
            margin: 0;
            font-weight: 600;
            color: #92400e;
        }
        @media print {
            body { margin: 0; padding: 20px; font-size: 12px; }
            .document-header { margin: -20px -20px 30px -20px; }
        }
    </style>
</head>
<body>
    <!-- Enhanced Document Header -->
    <div class="document-header">
        <h1>Vehicle Loan Agreement</h1>
        <p>PaySolutions LLC - Professional Financing Services</p>
    </div>

    <div class="section">
        <h3>📋 Loan Information</h3>
        <table class="loan-info-table">
            <tr>
                <th>Application Date:</th>
                <td>${currentDate}</td>
                <th>Requested Loan Amount:</th>
                <td>$${loanData.principalAmount.toLocaleString()}</td>
            </tr>
            <tr>
                <th>Dealership:</th>
                <td colspan="3">Pay Solutions</td>
            </tr>
        </table>
        
        ${loanData.vehicle ? `
        <table class="loan-info-table">
            <tr>
                <th>Vehicle Year:</th>
                <td>${loanData.vehicle.year}</td>
                <th>Make:</th>
                <td>${loanData.vehicle.make}</td>
            </tr>
            <tr>
                <th>Model:</th>
                <td>${loanData.vehicle.model}</td>
                <th>VIN:</th>
                <td>${loanData.vehicle.vin}</td>
            </tr>
        </table>
        ` : ''}
    </div>

    <div class="contact-info">
        <div class="contact-box">
            <h4>🏢 Lender Information</h4>
            <strong style="color: #1e40af; font-size: 16px;">Pay Solutions LLC</strong><br>
            575 NW 50th St<br>
            Miami, FL 33166<br>
            <br>
            <strong>Professional Lending Services</strong><br>
            <em>Your trusted financial partner</em>
        </div>
        <div class="contact-box">
            <h4>👤 Borrower Information</h4>
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
    <div class="section">
        <h3>📞 References</h3>
        <table class="loan-info-table">
            ${loanData.borrower.reference1Name ? `
            <tr>
                <th>Reference 1:</th>
                <td>${loanData.borrower.reference1Name}</td>
                <th>Phone:</th>
                <td>${loanData.borrower.reference1Phone || ''}</td>
            </tr>
            ` : ''}
            ${loanData.borrower.reference2Name ? `
            <tr>
                <th>Reference 2:</th>
                <td>${loanData.borrower.reference2Name}</td>
                <th>Phone:</th>
                <td>${loanData.borrower.reference2Phone || ''}</td>
            </tr>
            ` : ''}
        </table>
    </div>
    ` : ''}

    <div class="section">
        <h3>📄 Personal Financing Agreement ("PFA") - Exhibit "A"</h3>
        <table class="loan-info-table">
            <tr>
                <th>Borrower Name:</th>
                <td>${loanData.borrower.firstName} ${loanData.borrower.lastName}</td>
                <th>Interest Rate:</th>
                <td>${(loanData.interestRate * 100).toFixed(2)}%</td>
            </tr>
            <tr>
                <th>Principal Amount:</th>
                <td>$${loanData.principalAmount.toLocaleString()}</td>
                <th>Issue Date:</th>
                <td>${currentDate}</td>
            </tr>
            <tr>
                <th>Term (Weeks):</th>
                <td>${loanData.termWeeks}</td>
                <th>First Payment Date:</th>
                <td>${firstPaymentDate.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}</td>
            </tr>
        </table>
    </div>

    <!-- Amortization Schedule -->
    <div class="section">
        <h3>📊 Weekly Payment Schedule</h3>
        <div class="highlight-box">
            <p>Total of ${loanData.termWeeks} Weekly Payments</p>
        </div>
        <table class="schedule-table">
            <thead>
                <tr>
                    <th>Payment #</th>
                    <th>Due Date</th>
                    <th>Principal</th>
                    <th>Interest</th>
                    <th>Total Payment</th>
                    <th>Remaining Balance</th>
                </tr>
            </thead>
            <tbody>
                ${paymentSchedule.map(payment => `
                <tr>
                    <td>${payment.paymentNumber}</td>
                    <td>${payment.dueDate}</td>
                    <td>$${payment.principalAmount.toFixed(2)}</td>
                    <td>$${payment.interestAmount.toFixed(2)}</td>
                    <td>$${payment.totalAmount.toFixed(2)}</td>
                    <td>$${payment.remainingBalance.toFixed(2)}</td>
                </tr>
                `).join('')}
            </tbody>
        </table>
        
        <div class="financial-summary">
            <h4>💰 Financial Summary</h4>
            <table class="loan-info-table" style="margin: 0;">
                <tr>
                    <th>Principal Amount:</th>
                    <td style="font-weight: 700; color: #1e40af;">$${loanData.principalAmount.toLocaleString()}</td>
                    <th>Finance Charge:</th>
                    <td style="font-weight: 700; color: #dc2626;">$${totalFinanceCharge.toFixed(2)}</td>
                    <th>Total of Payments:</th>
                    <td style="font-weight: 700; color: #059669;">$${totalOfPayments.toFixed(2)}</td>
                </tr>
            </table>
        </div>
    </div>

    <!-- Page Break for Legal Content -->
    <div class="page-break"></div>

    <!-- Legal Agreement Content -->
    <div class="document-header">
        <h1>Personal Financing Agreement</h1>
        <p>Pay Solutions LLC - The Simple, Smart Way to Grow</p>
    </div>

    <div class="legal-text">
        <p><strong>YOU</strong> and <strong>PAY SOLUTIONS LLC</strong> (hereinafter referred to as "PS") are entering into this personal financing agreement (hereinafter referred to as "Agreement" or "PFA" interchangeably) for the purposes of a personal financing contract to partially cover a down payment for a vehicle sold by ${loanData.purpose || 'the dealership'} to you as "Buyer" or "Borrower" (hereinafter interchangeably), and agree as follows:</p>
    </div>

    <div class="section">
        <h3>⚖️ Contract Parties</h3>
        <ol>
            <li><strong>BORROWER</strong> shall mean, an individual ("Borrower"), ${loanData.borrower.firstName} ${loanData.borrower.lastName} with mailing address at ${loanData.borrower.addressLine1}, ${loanData.borrower.city}, ${loanData.borrower.state} ${loanData.borrower.zipCode}.</li>
            <li><strong>LENDER</strong> shall mean PAY SOLUTIONS LLC ("PS"), a Florida Limited Liability Company at its office at 575 NW 50th St, Miami, FL 33166, its successors, assigns, and any other holder of this PFA.</li>
            <li><strong>PAYMENT BENEFICIARY</strong> shall mean the dealership or entity from whom the vehicle is being purchased.</li>
        </ol>
    </div>

    <div class="section">
        <h3>✅ Borrower's Representations</h3>
        <p>You represent and acknowledge that: <span style="color: white;">\\i1\\</span> (Initial)</p>
        <ol>
            <li><strong>Legal Age.</strong> You are of legal age and have legal capacity to enter into this Contract.</li>
            <li><strong>Vehicle Condition.</strong> I have thoroughly inspected, accepted, and approved the motor vehicle in all respects, and I am satisfied with the condition of the vehicle.</li>
            <li><strong>Separate to Retail Contract.</strong> You represent and understand that this is not an agreement to purchase the vehicle, but rather, an agreement to cover the down payment portion of said vehicle.</li>
            <li><strong>No Oral Promises.</strong> You agree that this contract shall be controlling over all oral and verbal discussion and negotiations leading up to this contract.</li>
        </ol>
    </div>

    <div class="section">
        <h3>💳 Payment Terms</h3>
        <p>Initial to acknowledge: <span style="color: white;">\\i2\\</span></p>
        <ol>
            <li>For all provisions in this contract, time is of the essence.</li>
            <li>Principal Amount shall mean $${loanData.principalAmount.toLocaleString()} (US Dollars) that will cover a portion of an initial payment.</li>
            <li>For VALUE RECEIVED, the Buyer hereby promises to pay to the order of the Lender, the Principal Amount with interest at the annual rate of ${(loanData.interestRate * 100).toFixed(2)}% percent, interest shall be calculated on a 365/365 simple interest basis.</li>
            <li>All payments shall be received on or before the business day specified in Exhibit "A". If a payment is not received by the end of the business day applicable, an automatic $10.00 flat administrative late fee shall be assessed.</li>
            <li>All payments shall be received on a Business Day on or before 5:00PM Eastern Time (ET).</li>
            <li>If payment is returned for any reason, a returned payment fee of $35.00 shall be paid by Borrower upon demand.</li>
            <li><strong>Card Payment Surcharge.</strong> If a customer makes a payment using a card, a surcharge of 1.8% of the payment amount will be applied.</li>
            <li>Borrower can request up to two deferment payments to extend for seven (7) days the current payment date. A fee of $20.00 shall be charged.</li>
            <li><strong>No Prepayment Penalty.</strong> This PFA may be prepaid in whole or in part at any time, without incurring any penalty.</li>
        </ol>
    </div>

    <div class="section">
        <h3>⚠️ Default Conditions</h3>
        <p>Initial to acknowledge: <span style="color: white;">\\i3\\</span></p>
        <p>You will be deemed in default if any of the following occurs:</p>
        <ol>
            <li>You fail to perform any obligation under this Contract.</li>
            <li>Buyer fails to timely pay as per schedule, or within five (5) days of due date.</li>
            <li>Any materially false statement(s) is made by Borrower.</li>
            <li>Any bankruptcy proceeding is begun by or against Borrower.</li>
            <li>Cancellation or attempted cancellation of this agreement unilaterally by Borrower.</li>
            <li>Failure to report change of name, address or telephone number with at least thirty (30) days' notice.</li>
        </ol>
    </div>

    <div class="section">
        <h3>📋 Additional Agreements</h3>
        <p>Initial to acknowledge: <span style="color: white;">\\i4\\</span></p>
        <ol>
            <li><strong>GPS/Tracking Device Installation.</strong> Your vehicle could potentially feature a GPS/TRACKING DEVICE and by signing this document you acknowledge and give consent to the device's installation.</li>
            <li><strong>Waiver of Privacy Rights.</strong> You agree that you have no privacy rights in the tracking of your vehicle for collection and/or repossession purposes.</li>
            <li><strong>Electronic Communications.</strong> You give permission to contact you via telephone, SMS text messages, emails, or messaging applications.</li>
        </ol>
    </div>

    <div class="legal-text">
        <p><strong>JURY TRIAL WAIVER.</strong> LENDER AND BORROWER HEREBY KNOWINGLY, VOLUNTARILY AND INTENTIONALLY WAIVE THE RIGHT EITHER MAY HAVE TO A TRIAL BY JURY. <span style="color: white;">\\i5\\</span> (Initial)</p>
    </div>

    <div class="legal-text">
        <p><strong>ARBITRATION PROVISION:</strong> Any claim or dispute between you and us shall, at your or our election, be resolved by neutral, binding arbitration and not by a court action. (Initial provided separately)</p>
    </div>

    <!-- Signatures Section -->
    <div class="signature-section">
        <h3>ACKNOWLEDGMENT AND SIGNATURES</h3>
        <p>THIS AGREEMENT IS SUBJECT TO AN ARBITRATION AGREEMENT AND A PRESUIT DEMAND NOTICE REQUIREMENT, AS SET FORTH IN THIS AGREEMENT. BY SIGNING BELOW, I ACKNOWLEDGE THAT I HAVE READ AND UNDERSTOOD THE PROVISIONS IN THIS AGREEMENT AND AGREE TO THE TERMS AND CONDITIONS AS SET FORTH THEREIN.</p>
        
        <p><strong>I HEREBY SWEAR AND AFFIRM THAT I HAVE READ AND UNDERSTAND THE TERMS OF THIS CONTRACT.</strong> (Initial required above)</p>
        
        <div style="margin-top: 40px;">
            <table style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td style="width: 50%; padding-right: 20px; vertical-align: top;">
                        <p><strong>Borrower Signature:</strong></p>
                        <div style="border-bottom: 2px solid #000; height: 40px; margin: 20px 0;">
                            <span style="color: white;">\\s1\\</span>
                        </div>
                        <p>Print Name: ${loanData.borrower.firstName} ${loanData.borrower.lastName}</p>
                        <p>Date: <span style="color: white;">\\d1\\</span>_______________</p>
                    </td>
                    <td style="width: 50%; padding-left: 20px; vertical-align: top;">
                        <p><strong>Dealer Representative:</strong></p>
                        <div style="border-bottom: 2px solid #000; height: 40px; margin: 20px 0;"></div>
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

// Create DocuSign envelope with loan agreement
export const createLoanAgreementEnvelope = (loanData: LoanForDocuSign): docusign.EnvelopeDefinition => {
  const documentHtml = generateLoanAgreementHTML(loanData);
  
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

  // TODO: Add initial tabs when DocuSign TypeScript definitions support them
  // For now, initial fields will be handled manually or via DocuSign UI

  // Add tabs to signer (excluding initial tabs due to TypeScript limitations)
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
