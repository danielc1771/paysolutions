import { NextRequest, NextResponse } from 'next/server';
import { getEnvelopesApi } from '@/utils/docusign/client';

export async function GET(request: NextRequest) {
  try {
    const templateId = process.env.DOCUSIGN_TEMPLATE_ID;
    
    if (!templateId) {
      return NextResponse.json({
        error: 'Template ID not configured'
      }, { status: 400 });
    }

    console.log('🧪 Testing basic template access:', templateId);

    const { templatesApi, accountId } = await getEnvelopesApi();
    
    console.log('Account ID:', accountId);
    console.log('Template ID:', templateId);

    // Test 1: Get template basic info
    try {
      console.log('📋 Test 1: Getting template info...');
      const templateInfo = await templatesApi.get(accountId, templateId);
      console.log('✅ Template info retrieved');
      
      // Test 2: Get template recipients
      console.log('📋 Test 2: Getting template recipients...');
      const recipients = await templatesApi.listRecipients(accountId, templateId);
      console.log('✅ Template recipients retrieved');
      
      // Test 3: Try to get tabs with first recipient
      let tabsResult = null;
      let tabsError = null;
      
      if (recipients.signers && recipients.signers.length > 0) {
        const recipientId = recipients.signers[0].recipientId;
        console.log(`📋 Test 3: Getting tabs for recipient ${recipientId}...`);
        
        try {
          tabsResult = await templatesApi.listTabs(accountId, templateId, recipientId);
          console.log('✅ Template tabs retrieved');
        } catch (error) {
          console.log('❌ Failed to get tabs:', error);
          tabsError = error instanceof Error ? error.message : 'Unknown error';
        }
      }

      return NextResponse.json({
        success: true,
        templateId,
        accountId,
        templateInfo: {
          name: templateInfo.name,
          templateId: templateInfo.templateId,
          status: templateInfo.status,
          created: templateInfo.created
        },
        recipients: {
          signers: recipients.signers?.map((s: any) => ({
            recipientId: s.recipientId,
            roleName: s.roleName,
            name: s.name,
            email: s.email
          })) || []
        },
        tabs: tabsResult ? {
          textTabs: tabsResult.textTabs?.length || 0,
          numberTabs: tabsResult.numberTabs?.length || 0,
          dateTabs: tabsResult.dateTabs?.length || 0,
          checkboxTabs: tabsResult.checkboxTabs?.length || 0,
          signHereTabs: tabsResult.signHereTabs?.length || 0
        } : null,
        tabsError
      });

    } catch (error) {
      console.error('❌ Template access failed:', error);
      
      // Log detailed error
      if (error && typeof error === 'object' && 'response' in error) {
        const apiError = error as any;
        console.error('API Error Details:', {
          status: apiError.response?.status,
          statusText: apiError.response?.statusText,
          data: apiError.response?.data
        });
      }
      
      return NextResponse.json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        templateId,
        accountId
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Failed to test template access'
    }, { status: 500 });
  }
}
