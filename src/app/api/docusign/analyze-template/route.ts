import { NextRequest, NextResponse } from 'next/server';
import { getTemplateTabs, extractTabLabels } from '@/utils/docusign/client';

export async function GET(request: NextRequest) {
  try {
    const templateId = process.env.DOCUSIGN_TEMPLATE_ID;
    
    if (!templateId) {
      return NextResponse.json({
        error: 'Template ID not configured'
      }, { status: 400 });
    }

    console.log('🔍 Analyzing DocuSign template:', templateId);

    // Get all template tabs
    const templateTabs = await getTemplateTabs(templateId);
    
    // Extract tab labels
    const tabLabels = await extractTabLabels(templateId);
    
    // Analyze tab structure
    const analysis = {
      templateId,
      totalTabs: tabLabels.length,
      tabLabels: tabLabels.sort(),
      tabsByType: {
        textTabs: templateTabs.textTabs?.length || 0,
        numberTabs: templateTabs.numberTabs?.length || 0,
        dateTabs: templateTabs.dateTabs?.length || 0,
        checkboxTabs: templateTabs.checkboxTabs?.length || 0,
        signHereTabs: templateTabs.signHereTabs?.length || 0,
        initialHereTabs: templateTabs.initialHereTabs?.length || 0
      },
      detailedTabs: {
        textTabs: templateTabs.textTabs?.map((tab: any) => ({
          tabLabel: tab.tabLabel,
          value: tab.value,
          required: tab.required,
          locked: tab.locked
        })) || [],
        numberTabs: templateTabs.numberTabs?.map((tab: any) => ({
          tabLabel: tab.tabLabel,
          value: tab.value,
          required: tab.required,
          locked: tab.locked
        })) || [],
        dateTabs: templateTabs.dateTabs?.map((tab: any) => ({
          tabLabel: tab.tabLabel,
          value: tab.value,
          required: tab.required,
          locked: tab.locked
        })) || []
      }
    };

    console.log('✅ Template analysis complete');
    
    return NextResponse.json({
      success: true,
      analysis
    });

  } catch (error) {
    console.error('❌ Template analysis failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Failed to analyze template'
    }, { status: 500 });
  }
}
