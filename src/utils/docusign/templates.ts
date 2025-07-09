import 'server-only';
import docusign from 'docusign-esign';

export interface LoanData {
  loanNumber: string;
  principalAmount: number;
  interestRate: number;
  termMonths: number;
  monthlyPayment: number;
  purpose: string;
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

// Generate loan agreement document content
export const generateLoanAgreementHTML = (loanData: LoanData): string => {
  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return `
<!DOCTYPE html>
<html>
<head>
    <title>Loan Agreement - ${loanData.loanNumber}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
        .header { text-align: center; margin-bottom: 30px; }
        .section { margin-bottom: 25px; }
        .signature-block { margin-top: 50px; border: 1px solid #ccc; padding: 20px; }
        .terms-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .terms-table th, .terms-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        .terms-table th { background-color: #f2f2f2; }
        .highlight { background-color: #ffffcc; }
    </style>
</head>
<body>
    <div class="header">
        <h1>LOAN AGREEMENT</h1>
        <h2>Loan Number: ${loanData.loanNumber}</h2>
        <p>Date: ${currentDate}</p>
    </div>

    <div class="section">
        <h3>PARTIES</h3>
        <p><strong>Lender:</strong> PaySolutions Financial Services</p>
        <p><strong>Borrower:</strong> ${loanData.borrower.firstName} ${loanData.borrower.lastName}</p>
        <p><strong>Borrower Address:</strong> ${loanData.borrower.addressLine1}, ${loanData.borrower.city}, ${loanData.borrower.state} ${loanData.borrower.zipCode}</p>
    </div>

    <div class="section">
        <h3>LOAN TERMS</h3>
        <table class="terms-table">
            <tr>
                <th>Principal Amount</th>
                <td>$${loanData.principalAmount.toLocaleString()}</td>
            </tr>
            <tr>
                <th>Interest Rate (APR)</th>
                <td>${(loanData.interestRate * 100).toFixed(2)}%</td>
            </tr>
            <tr>
                <th>Term</th>
                <td>${loanData.termMonths} months</td>
            </tr>
            <tr>
                <th>Monthly Payment</th>
                <td>$${loanData.monthlyPayment.toLocaleString()}</td>
            </tr>
            <tr>
                <th>Loan Purpose</th>
                <td>${loanData.purpose}</td>
            </tr>
        </table>
    </div>

    <div class="section">
        <h3>BORROWER INFORMATION</h3>
        <p><strong>Employment Status:</strong> ${loanData.borrower.employmentStatus || 'Not specified'}</p>
        <p><strong>Annual Income:</strong> $${loanData.borrower.annualIncome?.toLocaleString() || 'Not specified'}</p>
        <p><strong>Date of Birth:</strong> ${loanData.borrower.dateOfBirth || 'Not specified'}</p>
        <p><strong>SSN:</strong> ***-**-${loanData.borrower.ssn ? loanData.borrower.ssn.slice(-4) : '****'}</p>
        ${loanData.borrower.currentEmployerName ? `<p><strong>Current Employer:</strong> ${loanData.borrower.currentEmployerName}</p>` : ''}
        ${loanData.borrower.timeWithEmployment ? `<p><strong>Time with Employment:</strong> ${loanData.borrower.timeWithEmployment}</p>` : ''}
    </div>

    ${(loanData.borrower.reference1Name || loanData.borrower.reference2Name || loanData.borrower.reference3Name) ? `
    <div class="section">
        <h3>REFERENCES</h3>
        ${loanData.borrower.reference1Name ? `
        <div style="margin-bottom: 15px; padding: 10px; border: 1px solid #eee;">
            <h4>Reference 1</h4>
            <p><strong>Name:</strong> ${loanData.borrower.reference1Name}</p>
            ${loanData.borrower.reference1Phone ? `<p><strong>Phone:</strong> ${loanData.borrower.reference1Phone}</p>` : ''}
            ${loanData.borrower.reference1Email ? `<p><strong>Email:</strong> ${loanData.borrower.reference1Email}</p>` : ''}
        </div>
        ` : ''}
        ${loanData.borrower.reference2Name ? `
        <div style="margin-bottom: 15px; padding: 10px; border: 1px solid #eee;">
            <h4>Reference 2</h4>
            <p><strong>Name:</strong> ${loanData.borrower.reference2Name}</p>
            ${loanData.borrower.reference2Phone ? `<p><strong>Phone:</strong> ${loanData.borrower.reference2Phone}</p>` : ''}
            ${loanData.borrower.reference2Email ? `<p><strong>Email:</strong> ${loanData.borrower.reference2Email}</p>` : ''}
        </div>
        ` : ''}
        ${loanData.borrower.reference3Name ? `
        <div style="margin-bottom: 15px; padding: 10px; border: 1px solid #eee;">
            <h4>Reference 3</h4>
            <p><strong>Name:</strong> ${loanData.borrower.reference3Name}</p>
            ${loanData.borrower.reference3Phone ? `<p><strong>Phone:</strong> ${loanData.borrower.reference3Phone}</p>` : ''}
            ${loanData.borrower.reference3Email ? `<p><strong>Email:</strong> ${loanData.borrower.reference3Email}</p>` : ''}
        </div>
        ` : ''}
    </div>
    ` : ''}

    <div class="section">
        <h3>TERMS AND CONDITIONS</h3>
        <ol>
            <li><strong>Payment Schedule:</strong> The borrower agrees to make monthly payments of $${loanData.monthlyPayment.toLocaleString()} beginning 30 days from the date of this agreement.</li>
            <li><strong>Interest:</strong> Interest will accrue at the rate of ${(loanData.interestRate * 100).toFixed(2)}% per annum on the outstanding principal balance.</li>
            <li><strong>Late Fees:</strong> A late fee of $25 will be charged for payments received more than 10 days after the due date.</li>
            <li><strong>Prepayment:</strong> The borrower may prepay the loan in whole or in part at any time without penalty.</li>
            <li><strong>Default:</strong> Failure to make payments when due may result in acceleration of the entire loan balance.</li>
            <li><strong>Governing Law:</strong> This agreement shall be governed by the laws of the state where the lender is located.</li>
        </ol>
    </div>

    <div class="section">
        <h3>ACKNOWLEDGMENT</h3>
        <p>By signing below, the borrower acknowledges that they have read, understood, and agree to be bound by the terms of this loan agreement.</p>
    </div>

    <div class="signature-block">
        <h3>SIGNATURES</h3>
        <div style="margin-top: 40px;">
            <div style="display: inline-block; width: 45%; vertical-align: top;">
                <p><strong>Borrower Signature:</strong></p>
                <div style="border-bottom: 1px solid #000; height: 40px; margin-bottom: 10px;"></div>
                <p>Print Name: ${loanData.borrower.firstName} ${loanData.borrower.lastName}</p>
                <p>Date: _______________</p>
            </div>
            <div style="display: inline-block; width: 45%; margin-left: 10%; vertical-align: top;">
                <p><strong>Lender Representative:</strong></p>
                <div style="border-bottom: 1px solid #000; height: 40px; margin-bottom: 10px;"></div>
                <p>Print Name: PaySolutions Admin</p>
                <p>Date: _______________</p>
            </div>
        </div>
    </div>
</body>
</html>
  `;
};

// Create DocuSign envelope with loan agreement
export const createLoanAgreementEnvelope = (loanData: LoanData): docusign.EnvelopeDefinition => {
  const documentHtml = generateLoanAgreementHTML(loanData);
  const documentBase64 = Buffer.from(documentHtml).toString('base64');

  // Create the document
  const document: docusign.Document = {
    documentBase64,
    name: `Loan Agreement - ${loanData.loanNumber}`,
    fileExtension: 'html',
    documentId: '1'
  };

  // Create signer
  const signer: docusign.Signer = {
    email: loanData.borrower.email,
    name: `${loanData.borrower.firstName} ${loanData.borrower.lastName}`,
    recipientId: '1',
    routingOrder: '1'
  };

  // Create signature tab
  const signHereTab: docusign.SignHere = {
    documentId: '1',
    pageNumber: '1',
    recipientId: '1',
    tabLabel: 'BorrowerSignature',
    xPosition: '100',
    yPosition: '600'
  };

  // Create date signed tab
  const dateSignedTab: docusign.DateSigned = {
    documentId: '1',
    pageNumber: '1',
    recipientId: '1',
    tabLabel: 'DateSigned',
    xPosition: '300',
    yPosition: '650'
  };

  // Add tabs to signer
  signer.tabs = {
    signHereTabs: [signHereTab],
    dateSignedTabs: [dateSignedTab]
  };

  // Create envelope definition
  const envelopeDefinition: docusign.EnvelopeDefinition = {
    emailSubject: `Loan Agreement for ${loanData.loanNumber} - Signature Required`,
    documents: [document],
    recipients: {
      signers: [signer]
    },
    status: 'sent'
  };

  // TODO: Add eventNotification configuration once we have a publicly accessible webhook URL
  // For now, we'll rely on the frontend polling mechanism for status updates

  return envelopeDefinition;
};
