import 'server-only';
import docusign from 'docusign-esign';
import { getTranslations, interpolate, Language } from '../translations';

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
export const generateLoanAgreementHTMLInline = (loanData: LoanData, language: Language = 'en'): string => {
  const t = getTranslations(language);
  const locale = language === 'es' ? 'es-ES' : 'en-US';
  
  const currentDate = new Date().toLocaleDateString(locale, {
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

  // Locale-aware date formatting for first payment
  const firstPaymentDateFormatted = firstPaymentDate.toLocaleDateString(locale, { 
    month: '2-digit', 
    day: '2-digit', 
    year: 'numeric' 
  });
  
  const totalFinanceCharge = paymentSchedule.reduce((sum, payment) => sum + payment.interestAmount, 0);
  const totalOfPayments = paymentSchedule.reduce((sum, payment) => sum + payment.totalAmount, 0);

  return `
<!DOCTYPE html>
<html>
<head>
    <title>${t.docusign.document.title} - ${loanData.loanNumber}</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; margin: 0; padding: 20px; line-height: 1.5; font-size: 14px; color: #333;">

    <!-- Enhanced Document Header -->
    <div style="background-color: #2563eb; color: white; padding: 30px 20px; text-align: center; margin: -20px -20px 30px -20px; border-radius: 0 0 15px 15px;">
        <h1 style="font-size: 28px; font-weight: bold; margin: 0 0 8px 0; letter-spacing: -0.5px;">${t.docusign.document.title}</h1>
        <p style="font-size: 16px; margin: 0; opacity: 0.9;">${t.docusign.document.companyTagline}</p>
    </div>

    <div style="background-color: #f8fafc; padding: 20px; margin: 20px 0; border-radius: 10px; border: 2px solid #e2e8f0;">
        <h3 style="color: #1e40af; font-size: 18px; font-weight: bold; margin: 0 0 15px 0; padding-bottom: 8px; border-bottom: 2px solid #3b82f6;">${t.docusign.document.loanInformation}</h3>
        <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
            <tr>
                <th style="border: 1px solid #d1d5db; padding: 10px; text-align: left; background-color: #3b82f6; color: white; font-weight: bold; font-size: 13px;">${t.docusign.headers.applicationDate}</th>
                <td style="border: 1px solid #d1d5db; padding: 10px; background-color: white; font-weight: 500;">${currentDate}</td>
                <th style="border: 1px solid #d1d5db; padding: 10px; text-align: left; background-color: #3b82f6; color: white; font-weight: bold; font-size: 13px;">${t.docusign.headers.requestedLoanAmount}</th>
                <td style="border: 1px solid #d1d5db; padding: 10px; background-color: white; font-weight: 500;">$${loanData.principalAmount.toLocaleString()}</td>
            </tr>
            <tr>
                <th style="border: 1px solid #d1d5db; padding: 10px; text-align: left; background-color: #3b82f6; color: white; font-weight: bold; font-size: 13px;">${t.docusign.headers.dealership}</th>
                <td colspan="3" style="border: 1px solid #d1d5db; padding: 10px; background-color: white; font-weight: 500;">Pay Solutions</td>
            </tr>
        </table>
        
        ${loanData.vehicle ? `
        <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
            <tr>
                <th style="border: 1px solid #d1d5db; padding: 10px; text-align: left; background-color: #3b82f6; color: white; font-weight: bold; font-size: 13px;">${t.docusign.headers.vehicleYear}</th>
                <td style="border: 1px solid #d1d5db; padding: 10px; background-color: white; font-weight: 500;">${loanData.vehicle.year}</td>
                <th style="border: 1px solid #d1d5db; padding: 10px; text-align: left; background-color: #3b82f6; color: white; font-weight: bold; font-size: 13px;">${t.docusign.headers.make}</th>
                <td style="border: 1px solid #d1d5db; padding: 10px; background-color: white; font-weight: 500;">${loanData.vehicle.make}</td>
            </tr>
            <tr>
                <th style="border: 1px solid #d1d5db; padding: 10px; text-align: left; background-color: #3b82f6; color: white; font-weight: bold; font-size: 13px;">${t.docusign.headers.model}</th>
                <td style="border: 1px solid #d1d5db; padding: 10px; background-color: white; font-weight: 500;">${loanData.vehicle.model}</td>
                <th style="border: 1px solid #d1d5db; padding: 10px; text-align: left; background-color: #3b82f6; color: white; font-weight: bold; font-size: 13px;">${t.docusign.headers.vin}</th>
                <td style="border: 1px solid #d1d5db; padding: 10px; background-color: white; font-weight: 500;">${loanData.vehicle.vin}</td>
            </tr>
        </table>
        ` : ''}
    </div>

    <div style="display: table; width: 100%; margin-bottom: 20px; border-spacing: 10px;">
        <div style="display: table-cell; width: 50%; border: 2px solid #3b82f6; border-radius: 10px; padding: 15px; background-color: #f0f9ff; vertical-align: top;">
            <h4 style="color: #1e40af; font-size: 16px; font-weight: bold; margin: 0 0 12px 0; text-transform: uppercase; letter-spacing: 0.5px;">${t.docusign.headers.lenderInformation}</h4>
            <strong style="color: #1e40af; font-size: 16px;">Pay Solutions LLC</strong><br>
            575 NW 50th St<br>
            Miami, FL 33166<br>
            <br>
            <strong>${t.docusign.headers.professionalLendingServices}</strong><br>
            <em>${t.docusign.headers.trustedFinancialPartner}</em>
        </div>
        <div style="display: table-cell; width: 50%; border: 2px solid #3b82f6; border-radius: 10px; padding: 15px; background-color: #f0f9ff; vertical-align: top;">
            <h4 style="color: #1e40af; font-size: 16px; font-weight: bold; margin: 0 0 12px 0; text-transform: uppercase; letter-spacing: 0.5px;">${t.docusign.headers.borrowerInformation}</h4>
            <strong style="color: #1e40af; font-size: 16px;">${loanData.borrower.firstName} ${loanData.borrower.lastName}</strong><br>
            📧 ${loanData.borrower.email}<br>
            ${loanData.borrower.phone ? `📱 ${loanData.borrower.phone}<br>` : ''}
            🎂 ${t.docusign.labels.dateOfBirth} ${loanData.borrower.dateOfBirth}<br>
            <br>
            <strong>${t.docusign.labels.address}</strong><br>
            ${loanData.borrower.addressLine1}<br>
            ${loanData.borrower.city}, ${loanData.borrower.state} ${loanData.borrower.zipCode}<br>
            <br>
            <strong>${t.docusign.labels.employment}</strong><br>
            ${t.docusign.labels.status} ${loanData.borrower.employmentStatus}<br>
            ${t.docusign.labels.annualSalary} $${loanData.borrower.annualIncome?.toLocaleString()}<br>
            ${loanData.borrower.currentEmployerName ? `${t.docusign.labels.employer} ${loanData.borrower.currentEmployerName}<br>` : ''}
            ${loanData.borrower.timeWithEmployment ? `${t.docusign.labels.timeWithEmployer} ${loanData.borrower.timeWithEmployment}` : ''}
        </div>
    </div>

    ${(loanData.borrower.reference1Name || loanData.borrower.reference2Name) ? `
    <div style="background-color: #f8fafc; padding: 20px; margin: 20px 0; border-radius: 10px; border: 2px solid #e2e8f0;">
        <h3 style="color: #1e40af; font-size: 18px; font-weight: bold; margin: 0 0 15px 0; padding-bottom: 8px; border-bottom: 2px solid #3b82f6;">${t.docusign.headers.references}</h3>
        <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
            ${loanData.borrower.reference1Name ? `
            <tr>
                <th style="border: 1px solid #d1d5db; padding: 10px; text-align: left; background-color: #3b82f6; color: white; font-weight: bold; font-size: 13px;">${t.docusign.labels.reference1}</th>
                <td style="border: 1px solid #d1d5db; padding: 10px; background-color: white; font-weight: 500;">${loanData.borrower.reference1Name}</td>
                <th style="border: 1px solid #d1d5db; padding: 10px; text-align: left; background-color: #3b82f6; color: white; font-weight: bold; font-size: 13px;">${t.docusign.labels.phone}</th>
                <td style="border: 1px solid #d1d5db; padding: 10px; background-color: white; font-weight: 500;">${loanData.borrower.reference1Phone || ''}</td>
            </tr>
            ` : ''}
            ${loanData.borrower.reference2Name ? `
            <tr>
                <th style="border: 1px solid #d1d5db; padding: 10px; text-align: left; background-color: #3b82f6; color: white; font-weight: bold; font-size: 13px;">${t.docusign.labels.reference2}</th>
                <td style="border: 1px solid #d1d5db; padding: 10px; background-color: white; font-weight: 500;">${loanData.borrower.reference2Name}</td>
                <th style="border: 1px solid #d1d5db; padding: 10px; text-align: left; background-color: #3b82f6; color: white; font-weight: bold; font-size: 13px;">${t.docusign.labels.phone}</th>
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
                <th style="border: 1px solid #d1d5db; padding: 10px; text-align: left; background-color: #3b82f6; color: white; font-weight: bold; font-size: 13px;">${t.docusign.fields.borrowerName}</th>
                <td style="border: 1px solid #d1d5db; padding: 10px; background-color: white; font-weight: 500;">${loanData.borrower.firstName} ${loanData.borrower.lastName}</td>
                <th style="border: 1px solid #d1d5db; padding: 10px; text-align: left; background-color: #3b82f6; color: white; font-weight: bold; font-size: 13px;">${t.docusign.fields.interestRate}</th>
                <td style="border: 1px solid #d1d5db; padding: 10px; background-color: white; font-weight: 500;">${(loanData.interestRate * 100).toFixed(2)}%</td>
            </tr>
            <tr>
                <th style="border: 1px solid #d1d5db; padding: 10px; text-align: left; background-color: #3b82f6; color: white; font-weight: bold; font-size: 13px;">${t.docusign.fields.principalAmount}</th>
                <td style="border: 1px solid #d1d5db; padding: 10px; background-color: white; font-weight: 500;">$${loanData.principalAmount.toLocaleString()}</td>
                <th style="border: 1px solid #d1d5db; padding: 10px; text-align: left; background-color: #3b82f6; color: white; font-weight: bold; font-size: 13px;">${t.docusign.headers.issueDate}</th>
                <td style="border: 1px solid #d1d5db; padding: 10px; background-color: white; font-weight: 500;">${currentDate}</td>
            </tr>
            <tr>
                <th style="border: 1px solid #d1d5db; padding: 10px; text-align: left; background-color: #3b82f6; color: white; font-weight: bold; font-size: 13px;">${t.docusign.fields.termWeeks}</th>
                <td style="border: 1px solid #d1d5db; padding: 10px; background-color: white; font-weight: 500;">${loanData.termWeeks}</td>
                <th style="border: 1px solid #d1d5db; padding: 10px; text-align: left; background-color: #3b82f6; color: white; font-weight: bold; font-size: 13px;">${t.docusign.headers.firstPaymentDate}</th>
                <td style="border: 1px solid #d1d5db; padding: 10px; background-color: white; font-weight: 500;">${firstPaymentDateFormatted}</td>
            </tr>
        </table>
    </div>

    <!-- Amortization Schedule -->
    <div style="background-color: #f8fafc; padding: 20px; margin: 20px 0; border-radius: 10px; border: 2px solid #e2e8f0;">
        <h3 style="color: #1e40af; font-size: 18px; font-weight: bold; margin: 0 0 15px 0; padding-bottom: 8px; border-bottom: 2px solid #3b82f6;">${t.docusign.document.weeklyPaymentSchedule}</h3>
        <div style="background-color: #fef3c7; border: 2px solid #f59e0b; border-radius: 8px; padding: 12px; margin: 12px 0; text-align: center;">
            <p style="margin: 0; font-weight: bold; color: #92400e;">${interpolate(t.docusign.document.totalPayments, { termWeeks: loanData.termWeeks.toString() })}</p>
        </div>
        <table style="width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 12px;">
            <thead>
                <tr>
                    <th style="border: 1px solid #d1d5db; padding: 8px; text-align: center; background-color: #059669; color: white; font-weight: bold; font-size: 11px;">${t.docusign.fields.paymentNumber}</th>
                    <th style="border: 1px solid #d1d5db; padding: 8px; text-align: center; background-color: #059669; color: white; font-weight: bold; font-size: 11px;">${t.docusign.fields.dueDate}</th>
                    <th style="border: 1px solid #d1d5db; padding: 8px; text-align: center; background-color: #059669; color: white; font-weight: bold; font-size: 11px;">${t.docusign.fields.principal}</th>
                    <th style="border: 1px solid #d1d5db; padding: 8px; text-align: center; background-color: #059669; color: white; font-weight: bold; font-size: 11px;">${t.docusign.fields.interest}</th>
                    <th style="border: 1px solid #d1d5db; padding: 8px; text-align: center; background-color: #059669; color: white; font-weight: bold; font-size: 11px;">${t.docusign.fields.payment}</th>
                    <th style="border: 1px solid #d1d5db; padding: 8px; text-align: center; background-color: #059669; color: white; font-weight: bold; font-size: 11px;">${t.docusign.fields.balance}</th>
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
            <h4 style="color: #1e40af; font-size: 16px; font-weight: bold; margin: 0 0 12px 0; text-align: center;">${t.docusign.headers.financialSummary}</h4>
            <table style="width: 100%; border-collapse: collapse; margin: 0;">
                <tr>
                    <th style="border: 1px solid #d1d5db; padding: 10px; text-align: left; background-color: #3b82f6; color: white; font-weight: bold; font-size: 13px;">${t.docusign.fields.principalAmount}</th>
                    <td style="border: 1px solid #d1d5db; padding: 10px; background-color: white; font-weight: bold; color: #1e40af;">$${loanData.principalAmount.toLocaleString()}</td>
                    <th style="border: 1px solid #d1d5db; padding: 10px; text-align: left; background-color: #3b82f6; color: white; font-weight: bold; font-size: 13px;">${t.docusign.labels.financeCharge}</th>
                    <td style="border: 1px solid #d1d5db; padding: 10px; background-color: white; font-weight: bold; color: #dc2626;">$${totalFinanceCharge.toFixed(2)}</td>
                    <th style="border: 1px solid #d1d5db; padding: 10px; text-align: left; background-color: #3b82f6; color: white; font-weight: bold; font-size: 13px;">${t.docusign.labels.totalOfPayments}</th>
                    <td style="border: 1px solid #d1d5db; padding: 10px; background-color: white; font-weight: bold; color: #059669;">$${totalOfPayments.toFixed(2)}</td>
                </tr>
            </table>
        </div>
    </div>

    <!-- Page Break for Legal Content -->
    <div style="page-break-before: always;"></div>

    <!-- Legal Agreement Content -->
    <div style="background-color: #2563eb; color: white; padding: 30px 20px; text-align: center; margin: -20px -20px 30px -20px; border-radius: 0 0 15px 15px;">
        <h1 style="font-size: 28px; font-weight: bold; margin: 0 0 8px 0; letter-spacing: -0.5px;">${t.docusign.content.legalAgreementTitle}</h1>
        <p style="font-size: 16px; margin: 0; opacity: 0.9;">${t.docusign.content.legalAgreementSubtitle}</p>
    </div>

    <div style="text-align: justify; margin-bottom: 15px; line-height: 1.5; font-size: 14px;">
        <p>${interpolate(t.docusign.content.contractIntroduction, { purpose: loanData.purpose || 'the dealership' })}</p>
    </div>

    <div style="background-color: #f8fafc; padding: 20px; margin: 20px 0; border-radius: 10px; border: 2px solid #e2e8f0;">
        <h3 style="color: #1e40af; font-size: 18px; font-weight: bold; margin: 0 0 15px 0; padding-bottom: 8px; border-bottom: 2px solid #3b82f6;">${t.docusign.legal.contractParties}</h3>
        <ol style="counter-reset: item; padding-left: 0; margin: 15px 0;">
            <li style="display: block; margin-bottom: 12px; padding-left: 20px;"><span style="font-weight: bold; color: #1e40af;">a.</span> ${interpolate(t.docusign.content.borrowerDefinition, { borrowerName: `${loanData.borrower.firstName} ${loanData.borrower.lastName}`, address: `${loanData.borrower.addressLine1}, ${loanData.borrower.city}, ${loanData.borrower.state} ${loanData.borrower.zipCode}` })}</li>
            <li style="display: block; margin-bottom: 12px; padding-left: 20px;"><span style="font-weight: bold; color: #1e40af;">b.</span> ${t.docusign.content.lenderDefinition}</li>
            <li style="display: block; margin-bottom: 12px; padding-left: 20px;"><span style="font-weight: bold; color: #1e40af;">c.</span> ${t.docusign.content.paymentBeneficiaryDefinition}</li>
        </ol>
    </div>

    <div style="background-color: #f8fafc; padding: 20px; margin: 20px 0; border-radius: 10px; border: 2px solid #e2e8f0;">
        <h3 style="color: #1e40af; font-size: 18px; font-weight: bold; margin: 0 0 15px 0; padding-bottom: 8px; border-bottom: 2px solid #3b82f6;">${t.docusign.legal.borrowerRepresentations}</h3>
        <p>${t.docusign.content.representationIntro} <span style="color: white;">\\i1\\</span> (${t.docusign.fields.initialToAcknowledge})</p>
        <ol style="counter-reset: item; padding-left: 0; margin: 15px 0;">
            <li style="display: block; margin-bottom: 12px; padding-left: 20px;"><span style="font-weight: bold; color: #1e40af;">a.</span> <strong>Edad Legal.</strong> ${t.docusign.content.legalAgeText}</li>
            <li style="display: block; margin-bottom: 12px; padding-left: 20px;"><span style="font-weight: bold; color: #1e40af;">b.</span> <strong>Condición del Vehículo.</strong> ${t.docusign.content.vehicleConditionText}</li>
            <li style="display: block; margin-bottom: 12px; padding-left: 20px;"><span style="font-weight: bold; color: #1e40af;">c.</span> <strong>Separado del Contrato de Venta.</strong> ${t.docusign.content.separateContractText}</li>
            <li style="display: block; margin-bottom: 12px; padding-left: 20px;"><span style="font-weight: bold; color: #1e40af;">d.</span> <strong>Sin Promesas Orales.</strong> ${t.docusign.content.noOralPromisesText}</li>
        </ol>
    </div>

    <div style="background-color: #f8fafc; padding: 20px; margin: 20px 0; border-radius: 10px; border: 2px solid #e2e8f0;">
        <h3 style="color: #1e40af; font-size: 18px; font-weight: bold; margin: 0 0 15px 0; padding-bottom: 8px; border-bottom: 2px solid #3b82f6;">${t.docusign.legal.paymentTerms}</h3>
        <p>${t.docusign.content.paymentTermsIntro} <span style="color: white;">\\i2\\</span></p>
        <ol style="counter-reset: item; padding-left: 0; margin: 15px 0;">
            <li style="display: block; margin-bottom: 12px; padding-left: 20px;"><span style="font-weight: bold; color: #1e40af;">a.</span> ${t.docusign.content.paymentTermsItem1}</li>
            <li style="display: block; margin-bottom: 12px; padding-left: 20px;"><span style="font-weight: bold; color: #1e40af;">b.</span> ${interpolate(t.docusign.content.paymentTermsItem2, { principalAmount: `$${loanData.principalAmount.toLocaleString()}` })}</li>
            <li style="display: block; margin-bottom: 12px; padding-left: 20px;"><span style="font-weight: bold; color: #1e40af;">c.</span> ${interpolate(t.docusign.content.paymentTermsItem3, { interestRate: (loanData.interestRate * 100).toFixed(2) })}</li>
            <li style="display: block; margin-bottom: 12px; padding-left: 20px;"><span style="font-weight: bold; color: #1e40af;">d.</span> ${t.docusign.content.paymentTermsItem4}</li>
            <li style="display: block; margin-bottom: 12px; padding-left: 20px;"><span style="font-weight: bold; color: #1e40af;">e.</span> ${t.docusign.content.paymentTermsItem5}</li>
            <li style="display: block; margin-bottom: 12px; padding-left: 20px;"><span style="font-weight: bold; color: #1e40af;">f.</span> ${t.docusign.content.paymentTermsItem6}</li>
            <li style="display: block; margin-bottom: 12px; padding-left: 20px;"><span style="font-weight: bold; color: #1e40af;">g.</span> ${t.docusign.content.paymentTermsItem7}</li>
            <li style="display: block; margin-bottom: 12px; padding-left: 20px;"><span style="font-weight: bold; color: #1e40af;">h.</span> ${t.docusign.content.paymentTermsItem8}</li>
            <li style="display: block; margin-bottom: 12px; padding-left: 20px;"><span style="font-weight: bold; color: #1e40af;">i.</span> ${t.docusign.content.paymentTermsItem9}</li>
        </ol>
    </div>

    <div style="background-color: #f8fafc; padding: 20px; margin: 20px 0; border-radius: 10px; border: 2px solid #e2e8f0;">
        <h3 style="color: #1e40af; font-size: 18px; font-weight: bold; margin: 0 0 15px 0; padding-bottom: 8px; border-bottom: 2px solid #3b82f6;">${t.docusign.legal.defaultConditions}</h3>
        <p>${t.docusign.content.paymentTermsIntro} <span style="color: white;">\\i3\\</span></p>
        <p>${t.docusign.content.defaultConditionsIntro}</p>
        <ol style="counter-reset: item; padding-left: 0; margin: 15px 0;">
            <li style="display: block; margin-bottom: 12px; padding-left: 20px;"><span style="font-weight: bold; color: #1e40af;">a.</span> ${t.docusign.content.defaultItem1}</li>
            <li style="display: block; margin-bottom: 12px; padding-left: 20px;"><span style="font-weight: bold; color: #1e40af;">b.</span> ${t.docusign.content.defaultItem2}</li>
            <li style="display: block; margin-bottom: 12px; padding-left: 20px;"><span style="font-weight: bold; color: #1e40af;">c.</span> ${t.docusign.content.defaultItem3}</li>
            <li style="display: block; margin-bottom: 12px; padding-left: 20px;"><span style="font-weight: bold; color: #1e40af;">d.</span> ${t.docusign.content.defaultItem4}</li>
            <li style="display: block; margin-bottom: 12px; padding-left: 20px;"><span style="font-weight: bold; color: #1e40af;">e.</span> ${t.docusign.content.defaultItem5}</li>
            <li style="display: block; margin-bottom: 12px; padding-left: 20px;"><span style="font-weight: bold; color: #1e40af;">f.</span> ${t.docusign.content.defaultItem6}</li>
        </ol>
    </div>

    <div style="background-color: #f8fafc; padding: 20px; margin: 20px 0; border-radius: 10px; border: 2px solid #e2e8f0;">
        <h3 style="color: #1e40af; font-size: 18px; font-weight: bold; margin: 0 0 15px 0; padding-bottom: 8px; border-bottom: 2px solid #3b82f6;">${t.docusign.legal.additionalAgreements}</h3>
        <p>${t.docusign.content.additionalAgreementsIntro} <span style="color: white;">\\i4\\</span></p>
        <ol style="counter-reset: item; padding-left: 0; margin: 15px 0;">
            <li style="display: block; margin-bottom: 12px; padding-left: 20px;"><span style="font-weight: bold; color: #1e40af;">a.</span> <strong>Instalación de Dispositivo GPS/Rastreo.</strong> ${t.docusign.content.gpsTrackingText}</li>
            <li style="display: block; margin-bottom: 12px; padding-left: 20px;"><span style="font-weight: bold; color: #1e40af;">b.</span> <strong>Renuncia a Derechos de Privacidad.</strong> ${t.docusign.content.privacyWaiverText}</li>
            <li style="display: block; margin-bottom: 12px; padding-left: 20px;"><span style="font-weight: bold; color: #1e40af;">c.</span> <strong>Comunicaciones Electrónicas.</strong> ${t.docusign.content.electronicCommunicationsText}</li>
        </ol>
    </div>

    <div style="background-color: #f8fafc; padding: 20px; margin: 20px 0; border-radius: 10px; border: 2px solid #e2e8f0;">
        <h3 style="color: #1e40af; font-size: 18px; font-weight: bold; margin: 0 0 15px 0; padding-bottom: 8px; border-bottom: 2px solid #3b82f6;">${t.docusign.legal.fees}</h3>
        
        <div style="background-color: #fef3c7; border: 2px solid #f59e0b; border-radius: 8px; padding: 12px; margin: 12px 0;">
            <p style="margin: 0; font-weight: bold; color: #92400e; text-align: center;">${t.docusign.content.feesTitle}</p>
        </div>
        
        <div style="margin-bottom: 15px;">
            <h4 style="color: #dc2626; font-size: 16px; font-weight: bold; margin: 10px 0 5px 0;">${t.docusign.content.processingFeeTitle}</h4>
            <p style="margin: 5px 0; font-size: 14px;">${t.docusign.content.processingFeeDescription}</p>
            <p style="margin: 5px 0; font-size: 14px; font-weight: bold; color: #dc2626;">${t.docusign.content.processingFeeAmount}</p>
            <p style="margin: 5px 0; font-size: 14px; color: #059669;">${t.docusign.content.processingFeeAvoidance}</p>
        </div>
        
        <div style="margin-bottom: 15px;">
            <h4 style="color: #dc2626; font-size: 16px; font-weight: bold; margin: 10px 0 5px 0;">${t.docusign.content.lateFeeTitle}</h4>
            <p style="margin: 5px 0; font-size: 14px;">${t.docusign.content.lateFeeDescription}</p>
            <p style="margin: 5px 0; font-size: 14px; font-weight: bold; color: #dc2626;">${t.docusign.content.lateFeeAmount}</p>
        </div>
        
        <div style="margin-bottom: 15px;">
            <h4 style="color: #dc2626; font-size: 16px; font-weight: bold; margin: 10px 0 5px 0;">${t.docusign.content.defermentFeeTitle}</h4>
            <p style="margin: 5px 0; font-size: 14px;">${t.docusign.content.defermentFeeDescription}</p>
            <p style="margin: 5px 0; font-size: 14px; color: #6b7280;">${t.docusign.content.defermentFeeRestrictions}</p>
            <p style="margin: 5px 0; font-size: 14px; font-weight: bold; color: #dc2626;">${t.docusign.content.defermentFeeAmount}</p>
        </div>
        
        <div style="margin-bottom: 15px;">
            <h4 style="color: #dc2626; font-size: 16px; font-weight: bold; margin: 10px 0 5px 0;">${t.docusign.content.returnedPaymentFeeTitle}</h4>
            <p style="margin: 5px 0; font-size: 14px;">${t.docusign.content.returnedPaymentFeeDescription}</p>
            <p style="margin: 5px 0; font-size: 14px; font-weight: bold; color: #dc2626;">${t.docusign.content.returnedPaymentFeeAmount}</p>
        </div>
        
        <div style="background-color: #fef2f2; border: 2px solid #dc2626; border-radius: 8px; padding: 15px; margin: 15px 0;">
            <p style="margin: 0 0 10px 0; font-weight: bold; color: #dc2626; font-size: 16px;">${t.docusign.content.feesImportantNote}</p>
            <p style="margin: 5px 0; font-size: 14px;">${t.docusign.content.feesAutoDebit}</p>
            <p style="margin: 5px 0; font-size: 14px; font-weight: bold; color: #059669;">${t.docusign.content.accountVerificationFee}</p>
        </div>
    </div>

    <div style="text-align: justify; margin-bottom: 15px; line-height: 1.5; font-size: 14px;">
        <p><strong>RENUNCIA AL JUICIO POR JURADO.</strong> ${t.docusign.legal.juryTrialWaiver} <span style="color: white;">\\i5\\</span> (${t.docusign.fields.initialToAcknowledge})</p>
    </div>

    <div style="text-align: justify; margin-bottom: 15px; line-height: 1.5; font-size: 14px;">
        <p><strong>DISPOSICIÓN DE ARBITRAJE:</strong> ${t.docusign.legal.arbitrationProvision}</p>
    </div>

    <!-- Signatures Section -->
    <div style="margin-top: 30px; background-color: #f8fafc; padding: 25px; border-radius: 10px; border: 2px solid #e2e8f0;">
        <h3 style="color: #1e40af; font-size: 20px; font-weight: bold; margin: 0 0 15px 0; text-align: center; text-transform: uppercase; letter-spacing: 0.5px;">${t.docusign.headers.acknowledgmentSignatures}</h3>
        <p style="text-align: justify; margin-bottom: 15px; line-height: 1.5; font-size: 14px;">${t.docusign.legal.acknowledgmentText}</p>
        
        <p style="text-align: justify; margin-bottom: 15px; line-height: 1.5; font-size: 14px;"><strong>POR LA PRESENTE JURO Y AFIRMO QUE HE LEÍDO Y ENTIENDO LOS TÉRMINOS DE ESTE CONTRATO.</strong> ${t.docusign.legal.contractUnderstanding}</p>
        
        <div style="margin-top: 30px;">
            <table style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td style="width: 50%; padding-right: 15px; vertical-align: top;">
                        <p style="font-weight: bold;">${t.docusign.labels.borrowerSignature}</p>
                        <div style="border-bottom: 2px solid #000; height: 35px; margin: 15px 0;">
                            <span style="color: white;">\\s1\\</span>
                        </div>
                        <p>${t.docusign.labels.printName} ${loanData.borrower.firstName} ${loanData.borrower.lastName}</p>
                        <p>${t.docusign.labels.date} <span style="color: white;">\\d1\\</span>_______________</p>
                    </td>
                    <td style="width: 50%; padding-left: 15px; vertical-align: top;">
                        <p style="font-weight: bold;">${t.docusign.labels.dealerRepresentative}</p>
                        <div style="border-bottom: 2px solid #000; height: 35px; margin: 15px 0;"></div>
                        <p>${t.docusign.labels.printName} Pay Solutions Admin</p>
                        <p>${t.docusign.labels.date} _______________</p>
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
export const createLoanAgreementEnvelopeInline = (loanData: LoanData, language: Language = 'en'): docusign.EnvelopeDefinition => {
  const documentHtml = generateLoanAgreementHTMLInline(loanData, language);
  const t = getTranslations(language);
  
  // Use htmlDefinition for responsive HTML documents (best practice)
  const document: ExtendedDocument = {
    htmlDefinition: {
      source: documentHtml
    },
    name: `${t.docusign.document.title} - ${loanData.loanNumber}`,
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
    emailSubject: interpolate(t.docusign.document.emailSubject, { loanNumber: loanData.loanNumber }),
    documents: [document as docusign.Document],
    recipients: {
      signers: [signer]
    },
    status: 'sent'
  };

  return envelopeDefinition;
};