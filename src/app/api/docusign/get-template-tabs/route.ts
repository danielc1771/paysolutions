import { NextRequest, NextResponse } from 'next/server';
import { 
  listDocuSignTemplates, 
  getTemplateTabsByName 
} from '@/utils/docusign/client';

// Type definition for DocuSign template
interface DocuSignTemplate {
  templateId?: string;
  name?: string;
  description?: string;
  shared?: string;
  created?: string;
  lastModified?: string;
  owner?: unknown;
}

/**
 * API route to retrieve DocuSign template tabs
 * GET /api/docusign/get-template-tabs?templateName=iPay - Acuerdo de Financiamento Personal
 * 
 * This route bypasses authentication to test DocuSign functionality
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const templateName = searchParams.get('templateName') || 'iPay - Acuerdo de Financiamento Personal';

    console.log(`🔍 Testing DocuSign template tabs for: "${templateName}"`);

    // Step 1: List all templates to see what's available
    console.log('📋 Step 1: Listing all templates...');
    const allTemplates = await listDocuSignTemplates();
    
    console.log(`Found ${allTemplates.length} templates:`);
    allTemplates.forEach((template: DocuSignTemplate) => {
      console.log(`- ${template.name} (ID: ${template.templateId})`);
    });

    // Step 2: Try to find and get tabs for the specific template
    console.log(`📄 Step 2: Getting tabs for template: "${templateName}"`);
    let templateTabs;
    
    try {
      templateTabs = await getTemplateTabsByName(templateName);
    } catch (error) {
      // If template not found by exact name, try to find similar templates
      const similarTemplates = allTemplates.filter((t: DocuSignTemplate) => 
        t.name?.toLowerCase().includes('ipay') || 
        t.name?.toLowerCase().includes('acuerdo') ||
        t.name?.toLowerCase().includes('financiamento')
      );
      
      return NextResponse.json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: `Template "${templateName}" not found. Available templates:`,
        data: {
          allTemplates: allTemplates,
          similarTemplates: similarTemplates
        }
      }, { status: 404 });
    }

    // Step 3: Create field mapping analysis
    const fieldMappingAnalysis = {
      templateInfo: {
        templateId: templateTabs.templateId,
        templateName: templateTabs.templateName,
        totalRecipients: templateTabs.recipients.length
      },
      recipients: templateTabs.recipients.map(recipient => {
        const fillableFields = [
          ...recipient.tabs.textTabs.map(tab => ({
            tabLabel: tab.tabLabel,
            tabType: 'text',
            required: tab.required,
            currentValue: tab.value,
            suggestedMapping: suggestFieldMapping(tab.tabLabel, 'text')
          })),
          ...recipient.tabs.emailTabs.map(tab => ({
            tabLabel: tab.tabLabel,
            tabType: 'email', 
            required: tab.required,
            currentValue: tab.value,
            suggestedMapping: suggestFieldMapping(tab.tabLabel, 'email')
          })),
          ...recipient.tabs.numberTabs.map(tab => ({
            tabLabel: tab.tabLabel,
            tabType: 'number',
            required: tab.required,
            currentValue: tab.value,
            suggestedMapping: suggestFieldMapping(tab.tabLabel, 'number')
          })),
          ...recipient.tabs.dateTabs.map(tab => ({
            tabLabel: tab.tabLabel,
            tabType: 'date',
            required: tab.required,
            currentValue: tab.value,
            suggestedMapping: suggestFieldMapping(tab.tabLabel, 'date')
          })),
          ...recipient.tabs.checkboxTabs.map(tab => ({
            tabLabel: tab.tabLabel,
            tabType: 'checkbox',
            required: tab.required,
            currentValue: tab.selected,
            suggestedMapping: suggestFieldMapping(tab.tabLabel, 'checkbox')
          }))
        ];

        const signatureFields = [
          ...recipient.tabs.signHereTabs.map(tab => ({
            tabLabel: tab.tabLabel,
            tabType: 'signHere',
            required: tab.required
          })),
          ...recipient.tabs.initialHereTabs.map(tab => ({
            tabLabel: tab.tabLabel,
            tabType: 'initialHere',
            required: tab.required
          })),
          ...recipient.tabs.dateSignedTabs.map(tab => ({
            tabLabel: tab.tabLabel,
            tabType: 'dateSigned',
            required: tab.required
          }))
        ];

        return {
          roleName: recipient.roleName,
          recipientId: recipient.recipientId,
          totalFillableFields: fillableFields.length,
          totalSignatureFields: signatureFields.length,
          fillableFields: fillableFields,
          signatureFields: signatureFields
        };
      })
    };

    // Return structured JSON response
    return NextResponse.json({
      success: true,
      message: `Successfully retrieved tabs for template: ${templateName}`,
      data: {
        allTemplates: allTemplates,
        templateAnalysis: fieldMappingAnalysis,
        rawTemplateData: templateTabs
      }
    });

  } catch (error: unknown) {
    console.error('❌ Error in get-template-tabs:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Failed to retrieve template tabs. Check DocuSign credentials and configuration.'
    }, { status: 500 });
  }
}

// Helper function to suggest field mappings based on tab labels
function suggestFieldMapping(tabLabel: string | undefined, tabType: string): {
  borrowerField?: string;
  loanField?: string;
  staticValue?: string;
  description: string;
} {
  if (!tabLabel) return { description: 'No tab label provided' };

  const label = tabLabel.toLowerCase();
  
  // Borrower personal information mappings
  if (label.includes('first') && label.includes('name')) {
    return { borrowerField: 'firstName', description: 'Borrower first name' };
  }
  if (label.includes('last') && label.includes('name')) {
    return { borrowerField: 'lastName', description: 'Borrower last name' };
  }
  if (label.includes('email')) {
    return { borrowerField: 'email', description: 'Borrower email address' };
  }
  if (label.includes('phone')) {
    return { borrowerField: 'phone', description: 'Borrower phone number' };
  }
  if (label.includes('address')) {
    return { borrowerField: 'addressLine1', description: 'Borrower address' };
  }
  if (label.includes('city')) {
    return { borrowerField: 'city', description: 'Borrower city' };
  }
  if (label.includes('state')) {
    return { borrowerField: 'state', description: 'Borrower state' };
  }
  if (label.includes('zip')) {
    return { borrowerField: 'zipCode', description: 'Borrower ZIP code' };
  }
  if (label.includes('birth') || label.includes('dob')) {
    return { borrowerField: 'dateOfBirth', description: 'Borrower date of birth' };
  }
  if (label.includes('income')) {
    return { borrowerField: 'annualIncome', description: 'Borrower annual income' };
  }
  if (label.includes('employer')) {
    return { borrowerField: 'currentEmployerName', description: 'Borrower employer name' };
  }

  // Loan information mappings
  if (label.includes('loan') && label.includes('amount')) {
    return { loanField: 'principalAmount', description: 'Loan principal amount' };
  }
  if (label.includes('loan') && label.includes('number')) {
    return { loanField: 'loanNumber', description: 'Loan number' };
  }
  if (label.includes('interest') && label.includes('rate')) {
    return { loanField: 'interestRate', description: 'Loan interest rate' };
  }
  if (label.includes('term') || label.includes('weeks')) {
    return { loanField: 'termWeeks', description: 'Loan term in weeks' };
  }
  if (label.includes('payment') && (label.includes('weekly') || label.includes('amount'))) {
    return { loanField: 'weeklyPayment', description: 'Weekly payment amount' };
  }

  // Vehicle information mappings
  if (label.includes('vehicle') && label.includes('year')) {
    return { loanField: 'vehicleYear', description: 'Vehicle year' };
  }
  if (label.includes('vehicle') && label.includes('make')) {
    return { loanField: 'vehicleMake', description: 'Vehicle make' };
  }
  if (label.includes('vehicle') && label.includes('model')) {
    return { loanField: 'vehicleModel', description: 'Vehicle model' };
  }
  if (label.includes('vin')) {
    return { loanField: 'vehicleVin', description: 'Vehicle VIN' };
  }

  // Date fields
  if (label.includes('date') && tabType === 'date') {
    return { staticValue: 'current_date', description: 'Current date' };
  }

  // Default case
  return { 
    description: `Unknown field: ${tabLabel}. Manual mapping required.` 
  };
}