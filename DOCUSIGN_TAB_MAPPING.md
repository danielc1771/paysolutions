# DocuSign Tab Value Mapping Guide

This document explains how loan application data is mapped to DocuSign template tabs (form fields).

## Overview

When creating a DocuSign envelope, the system automatically pre-fills form fields in your template with data collected from the borrower's loan application. This is done by matching **tab labels** in your DocuSign template with field names in your application data.

## How Tab Mapping Works

### Step 1: Data Collection
When a borrower completes the loan application at `/apply/[loanId]`, all their information is stored in Supabase:
- Personal information (name, email, phone, address)
- Employment details (employer, income, employment status)
- References (names, phones, emails)
- Loan details (amount, type, term)

### Step 2: Field Mapping
The `field-mapper.ts` utility maps Supabase data to DocuSign tab labels:

```typescript
{
  'borrower_first_name': 'John',
  'borrower_last_name': 'Doe',
  'borrower_email': 'john@example.com',
  'borrower_salary': '75000',
  'loan_amount': '25000',
  'date_of_birth': '1990-01-15'
}
```

### Step 3: Tab Creation
The `makeEnvelope()` function creates the appropriate tab types:

**Text Tabs** - For text fields:
```typescript
docusign.Text.constructFromObject({
  tabLabel: 'borrower_first_name',
  value: 'John',
  locked: 'false',
  required: 'false'
})
```

**Number Tabs** - For monetary/numeric fields:
```typescript
docusign.Number.constructFromObject({
  tabLabel: 'loan_amount',
  value: '25000',
  locked: 'false',
  required: 'false'
})
```

**Date Tabs** - For date fields:
```typescript
docusign.Date.constructFromObject({
  tabLabel: 'date_of_birth',
  value: '1990-01-15',
  locked: 'false',
  required: 'false'
})
```

### Step 4: Tabs Attachment
All tabs are bundled together and attached to the Borrower's template role:

```typescript
let tabs = docusign.Tabs.constructFromObject({
  textTabs: [text1, text2, ...],
  numberTabs: [number1, number2, ...],
  dateTabs: [date1, date2, ...]
});

borrower.tabs = tabs; // Attach to Borrower role only
```

## Tab Label Mapping Reference

### Personal Information
| Tab Label | Supabase Field | Type | Example |
|-----------|---------------|------|---------|
| `borrower_first_name` | `borrower.first_name` | Text | "John" |
| `borrower_last_name` | `borrower.last_name` | Text | "Doe" |
| `borrower_email` | `borrower.email` | Text | "john@example.com" |
| `borrower_phone_number` | `verified_phone_number` | Text | "+1234567890" |
| `borrower_phone_country_code` | Hardcoded | Text | "+1" |
| `date_of_birth` | `borrower.date_of_birth` | Date | "1990-01-15" |

### Address Information
| Tab Label | Supabase Field | Type | Example |
|-----------|---------------|------|---------|
| `borrower_address_line_1` | `borrower.address` | Text | "123 Main St" |
| `borrower_city` | `borrower.city` | Text | "New York" |
| `borrower_state` | `borrower.state` | Text | "NY" |
| `borrower_zip_code` | `borrower.zip_code` | Text | "10001" |
| `borrower_country` | `borrower.country` | Text | "US" |

### Employment Information
| Tab Label | Supabase Field | Type | Example |
|-----------|---------------|------|---------|
| `employment_status` | `borrower.employment_status` | Text | "employed" |
| `borrower_employer` | `borrower.current_employer_name` | Text | "Acme Corp" |
| `borrower_employer_state` | `borrower.employer_state` | Text | "NY" |
| `borrower_employed_time` | `borrower.time_with_employment` | Text | "2 years" |
| `borrower_salary` | `borrower.annual_income` | Number | "75000" |
| `annual_income` | `borrower.annual_income` | Number | "75000" |

### Loan Information
| Tab Label | Supabase Field | Type | Example |
|-----------|---------------|------|---------|
| `loan_amount` | `loan.amount` | Number | "25000" |
| `loan_type` | `loan.loan_type` | Text | "Personal" |
| `loan_term` | `loan.term_months` | Number | "36" |
| `interest_rate` | `loan.interest_rate` | Number | "5.5" |
| `monthly_payment` | `loan.monthly_payment` | Number | "750.50" |

### References
| Tab Label | Supabase Field | Type | Example |
|-----------|---------------|------|---------|
| `borrower_reference_name_1` | `borrower.reference1_name` | Text | "Jane Smith" |
| `borrower_reference_name_1 _phone` | `borrower.reference1_phone` | Text | "5551234567" |
| `borrower_reference_name_1 _country_code` | `borrower.reference1_country_code` | Text | "+1" |
| `reference1_email` | `borrower.reference1_email` | Text | "jane@example.com" |
| `borrower_reference_name_2` | `borrower.reference2_name` | Text | "Bob Johnson" |
| `borrower_reference_name_2_phone` | `borrower.reference2_phone` | Text | "5559876543" |
| `borrower_reference_name_2_country_code` | `borrower.reference2_country_code` | Text | "+1" |
| `reference2_email` | `borrower.reference2_email` | Text | "bob@example.com" |
| `borrower_reference_name_3` | `borrower.reference3_name` | Text | "Alice Brown" |
| `borrower_reference_name_3_phone` | `borrower.reference3_phone` | Text | "5555555555" |
| `reference3_email` | `borrower.reference3_email` | Text | "alice@example.com" |

## Automatic Tab Type Detection

The system automatically determines the correct tab type based on the field name:

### Number Tabs
Fields containing these keywords are treated as numbers:
- `amount`
- `income`
- `salary`
- `price`
- `payment`

**Example:** `loan_amount`, `borrower_salary`, `monthly_payment`

### Date Tabs
Fields containing these keywords are treated as dates:
- `date`
- `dob`

**Example:** `date_of_birth`

### Text Tabs
All other fields are treated as text.

**Example:** `borrower_first_name`, `borrower_email`, `borrower_city`

## Customizing Tab Mapping

### Option 1: Update Field Mapper
To add or modify field mappings, edit `src/utils/docusign/field-mapper.ts`:

```typescript
export function mapLoanDataToDocuSignFields(loan: LoanApplicationData): Record<string, string> {
  return {
    // Add your custom mapping here
    'custom_field_label': loan.borrower.custom_field || '',
    
    // Existing mappings...
    'borrower_first_name': loan.borrower.first_name || '',
    // ...
  };
}
```

### Option 2: Update Tab Type Detection
To change how tab types are detected, edit `src/utils/docusign/jwt-client.ts`:

```typescript
// In makeEnvelope function
const isNumber = /amount|income|salary|price|payment|custom_numeric_field/i.test(tabLabel);
const isDate = /date|dob|custom_date_field/i.test(tabLabel);
```

## Important Notes

### Tab Label Matching
**CRITICAL:** Tab labels in your code must **exactly match** (case-sensitive) the tab labels in your DocuSign template.

❌ Wrong:
```typescript
'Borrower_First_Name' // Capital letters
'borrowerfirstname'   // No underscores
'borrower first name' // Spaces instead of underscores
```

✅ Correct:
```typescript
'borrower_first_name' // Exact match with template
```

### Finding Tab Labels in DocuSign
1. Log into DocuSign
2. Go to **Templates**
3. Open your template
4. Click on each field
5. Look for the **Data Label** or **Tab Label** property
6. Use that exact label in your field mapping

### Locked vs Unlocked Fields
Currently, all fields are set to `locked: 'false'`, meaning signers can modify the pre-filled values.

To lock fields (prevent editing):
```typescript
docusign.Text.constructFromObject({
  tabLabel: 'borrower_first_name',
  value: 'John',
  locked: 'true',  // Changed to true
  required: 'false'
})
```

### Required vs Optional Fields
Currently, all fields are set to `required: 'false'`, meaning they're optional.

To make fields required:
```typescript
docusign.Text.constructFromObject({
  tabLabel: 'borrower_first_name',
  value: 'John',
  locked: 'false',
  required: 'true'  // Changed to true
})
```

## Debugging Tab Mapping

### Check Console Logs
When creating an envelope, the system logs:
```
📝 Created 15 text tabs, 5 number tabs, 1 date tabs
```

This tells you how many tabs of each type were created.

### Verify Field Mapping
In the API route, you'll see:
```
📝 Fields to populate: 25
```

This shows how many fields have data to populate.

### Common Issues

**Issue: Fields not populating**
- Check that tab labels match exactly (case-sensitive)
- Verify data exists in Supabase for those fields
- Check console logs for tab creation count

**Issue: Wrong tab type**
- Update the regex pattern in `makeEnvelope()` to match your field names
- Or explicitly handle specific fields

**Issue: Some fields populate, others don't**
- Check field mapping in `field-mapper.ts`
- Ensure field names match your Supabase schema
- Verify data is not null/undefined

## Testing Tab Mapping

1. **Create a test loan** with complete data
2. **Call the API** to create envelope
3. **Check DocuSign** - log into DocuSign and view the envelope
4. **Verify fields** - ensure all expected fields are pre-filled
5. **Check logs** - review console output for tab creation details

## Example: Complete Flow

```typescript
// 1. Borrower data from Supabase
const loan = {
  borrower: {
    first_name: 'John',
    last_name: 'Doe',
    email: 'john@example.com',
    annual_income: 75000
  },
  amount: 25000
};

// 2. Field mapper creates mapping
const fields = {
  'borrower_first_name': 'John',
  'borrower_last_name': 'Doe',
  'borrower_email': 'john@example.com',
  'borrower_salary': '75000',
  'loan_amount': '25000'
};

// 3. makeEnvelope creates tabs
const textTabs = [
  Text('borrower_first_name', 'John'),
  Text('borrower_last_name', 'Doe'),
  Text('borrower_email', 'john@example.com')
];
const numberTabs = [
  Number('borrower_salary', '75000'),
  Number('loan_amount', '25000')
];

// 4. Tabs attached to Borrower role
borrower.tabs = Tabs({ textTabs, numberTabs });

// 5. Envelope created and sent
// Borrower receives email with pre-filled form
```

---

**Created**: 2025-09-30
**Last Updated**: 2025-09-30
