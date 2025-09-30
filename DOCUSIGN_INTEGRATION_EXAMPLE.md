# DocuSign Integration Example

This document shows how to integrate DocuSign into your loan application flow.

## Integration Point

After the borrower completes their loan application (step 9 in `/apply/[loanId]/page.tsx`), you'll trigger the DocuSign envelope creation.

## Example Implementation

### Option 1: Redirect to DocuSign After Application Submission

Modify the `handleSubmit` function in `/apply/[loanId]/page.tsx`:

```typescript
const handleSubmit = async () => {
  if (isSubmitting || step === 10) {
    return;
  }
  
  setIsSubmitting(true);
  setLoading(true);
  setError(null);
  
  try {
    // Step 1: Submit the application data
    await saveProgress(step, formData);
    const response = await fetch(`/api/apply/${loanId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.message || 'Failed to submit application.');
    }
    
    // Clear sessionStorage on successful submission
    clearSession();
    
    // Step 2: Create DocuSign envelope and get signing URL
    console.log('📝 Creating DocuSign envelope...');
    const docusignResponse = await fetch('/api/docusign/create-envelope', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ loanId }),
    });

    if (!docusignResponse.ok) {
      const err = await docusignResponse.json();
      console.error('DocuSign envelope creation failed:', err);
      // Still show success page even if DocuSign fails
      setStep(10);
      return;
    }

    const { signingUrl } = await docusignResponse.json();
    console.log('✅ DocuSign envelope created, redirecting to signing...');
    
    // Step 3: Redirect to DocuSign signing ceremony
    window.location.href = signingUrl;
    
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
    console.error('💥 Application submission failed:', errorMessage);
    setError(errorMessage);
  } finally {
    setLoading(false);
    setIsSubmitting(false);
  }
};
```

### Option 2: Show Success Page with "Sign Documents" Button

Alternatively, show a success page first, then let the user click to sign:

```typescript
// In your success step component
function SuccessMessage({ loanId }: { loanId: string }) {
  const [isCreatingEnvelope, setIsCreatingEnvelope] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignDocuments = async () => {
    setIsCreatingEnvelope(true);
    setError(null);

    try {
      const response = await fetch('/api/docusign/create-envelope', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loanId }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to create signing session');
      }

      const { signingUrl } = await response.json();
      
      // Redirect to DocuSign
      window.location.href = signingUrl;
    } catch (err: any) {
      setError(err.message);
      setIsCreatingEnvelope(false);
    }
  };

  return (
    <div className="text-center">
      <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
        <Check className="w-10 h-10 text-white" />
      </div>
      <h1 className="text-3xl font-bold text-gray-900 mb-4">
        Application Submitted!
      </h1>
      <p className="text-gray-600 mb-8">
        Your loan application has been received. Next, please sign the required documents.
      </p>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      <button
        onClick={handleSignDocuments}
        disabled={isCreatingEnvelope}
        className="px-8 py-4 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-2xl font-semibold hover:from-purple-600 hover:to-blue-600 transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center mx-auto"
      >
        {isCreatingEnvelope ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            Preparing Documents...
          </>
        ) : (
          <>
            Sign Documents
            <ArrowRight className="w-5 h-5 ml-2" />
          </>
        )}
      </button>
    </div>
  );
}
```

## Backend Integration

### Update Loan Status After Signing

The webhook automatically updates the loan status when documents are signed. You can also manually check:

```typescript
// In your admin dashboard or loan details page
const checkDocuSignStatus = async (envelopeId: string) => {
  const response = await fetch(`/api/docusign/envelope-status?envelopeId=${envelopeId}`);
  const data = await response.json();
  
  return data.status; // 'sent', 'delivered', 'completed', etc.
};
```

### Retrieve Signed Documents

To download the signed PDF (add this to your API routes):

```typescript
// src/app/api/docusign/download-document/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getEnvelopesApi } from '@/utils/docusign/jwt-client';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const envelopeId = searchParams.get('envelopeId');

  if (!envelopeId) {
    return NextResponse.json({ error: 'Missing envelopeId' }, { status: 400 });
  }

  try {
    const envelopesApi = await getEnvelopesApi();
    const USER_ID = process.env.USER_ID;
    
    // Get the combined PDF of all documents
    const document = await envelopesApi.getDocument(USER_ID!, envelopeId, 'combined');
    
    // Return as downloadable PDF
    return new NextResponse(document, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="loan-${envelopeId}.pdf"`
      }
    });
  } catch (error: any) {
    console.error('Failed to download document:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

## Testing Checklist

- [ ] RSA private key added to `private.key` file
- [ ] Environment variables configured in `.env`
- [ ] Database columns added to `loans` table
- [ ] Test JWT authentication (check console logs)
- [ ] Test envelope creation with a test loan
- [ ] Verify field mapping matches your DocuSign template
- [ ] Test embedded signing flow
- [ ] Test return URL redirect
- [ ] Configure and test webhook (use ngrok for local testing)
- [ ] Test document download

## Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│  Borrower Completes Application                             │
│  (fills out all fields in /apply/[loanId])                  │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  POST /api/apply/[loanId]                                   │
│  (saves application data to Supabase)                       │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  POST /api/docusign/create-envelope                         │
│  - Fetches loan data from Supabase                          │
│  - Maps data to DocuSign template fields                    │
│  - Creates envelope via DocuSign API                        │
│  - Returns signing URL                                      │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  Redirect to DocuSign Signing Ceremony                      │
│  (borrower reviews and signs document)                      │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  Borrower Completes Signing                                 │
│  → Redirected to /apply/[loanId]/docusign-complete          │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  DocuSign Sends Webhook                                     │
│  POST /api/docusign/webhook                                 │
│  - Updates loan.docusign_status = 'completed'               │
│  - Updates loan.status = 'documents_signed'                 │
└─────────────────────────────────────────────────────────────┘
```

## Common Customizations

### 1. Change Template Role Name

If your template uses a different role name (not "Applicant"), update in `jwt-client.ts`:

```typescript
const signer1 = docusign.TemplateRole.constructFromObject({
  email: email,
  name: name,
  tabs: tabs,
  clientUserId: INTEGRATION_KEY,
  roleName: 'YourRoleName' // Change this
});
```

### 2. Add Multiple Signers

```typescript
const signer1 = docusign.TemplateRole.constructFromObject({
  email: borrowerEmail,
  name: borrowerName,
  roleName: 'Borrower',
  clientUserId: INTEGRATION_KEY
});

const signer2 = docusign.TemplateRole.constructFromObject({
  email: coSignerEmail,
  name: coSignerName,
  roleName: 'Co-Signer',
  routingOrder: '2' // Signs after borrower
});

env.templateRoles = [signer1, signer2];
```

### 3. Send Email Instead of Embedded Signing

Remove `clientUserId` to send via email instead of embedded signing:

```typescript
const signer1 = docusign.TemplateRole.constructFromObject({
  email: email,
  name: name,
  tabs: tabs,
  // clientUserId: INTEGRATION_KEY, // Remove this line
  roleName: 'Applicant'
});
```

---

**Ready to integrate?** Start by adding your RSA private key to `private.key`, then test the authentication!
