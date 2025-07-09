import { NextRequest, NextResponse } from 'next/server';
import { 
  createConnectConfiguration, 
  listConnectConfigurations, 
  updateConnectConfiguration,
  deleteConnectConfiguration,
  getRecommendedConnectConfig,
  testWebhookUrl
} from '@/utils/docusign/connect-config';

/**
 * API endpoint to manage DocuSign Connect configurations
 * 
 * GET: List all Connect configurations
 * POST: Create a new Connect configuration
 * PUT: Update an existing Connect configuration
 * DELETE: Delete a Connect configuration
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    
    if (action === 'recommend') {
      // Get recommended configuration
      const protocol = request.headers.get('x-forwarded-proto') || 'https';
      const host = request.headers.get('host');
      const webhookUrl = `${protocol}://${host}/api/docusign/webhook`;
      
      const recommendedConfig = getRecommendedConnectConfig(webhookUrl);
      const isAccessible = await testWebhookUrl(webhookUrl);
      
      return NextResponse.json({
        success: true,
        recommendedConfig,
        webhookUrl,
        isAccessible,
        message: isAccessible 
          ? 'Webhook URL is accessible and ready for Connect configuration'
          : 'Warning: Webhook URL may not be accessible from DocuSign'
      });
    }
    
    // List all Connect configurations
    const configurations = await listConnectConfigurations();
    
    return NextResponse.json({
      success: true,
      configurations,
      message: 'Connect configurations retrieved successfully'
    });
    
  } catch (error) {
    console.error('❌ Error managing Connect configurations:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage,
        message: 'Failed to retrieve Connect configurations'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;
    
    if (action === 'create-recommended') {
      // Create recommended configuration
      const protocol = request.headers.get('x-forwarded-proto') || 'https';
      const host = request.headers.get('host');
      const webhookUrl = `${protocol}://${host}/api/docusign/webhook`;
      
      // Test webhook URL first
      const isAccessible = await testWebhookUrl(webhookUrl);
      if (!isAccessible) {
        return NextResponse.json({
          success: false,
          error: 'Webhook URL is not accessible',
          message: 'Cannot create Connect configuration with inaccessible webhook URL'
        }, { status: 400 });
      }
      
      const result = await createConnectConfiguration();
      
      return NextResponse.json({
        success: true,
        configuration: result,
        webhookUrl,
        message: 'Connect configuration created successfully with recommended settings'
      });
    }
    
    // Create custom configuration - currently not implemented
    return NextResponse.json({
      success: false,
      error: 'Custom configuration creation not implemented',
      message: 'Only recommended configuration creation is supported'
    }, { status: 400 });
    
  } catch (error) {
    console.error('❌ Error creating Connect configuration:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage,
        message: 'Failed to create Connect configuration'
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { connectId } = body;
    
    if (!connectId) {
      return NextResponse.json({
        success: false,
        error: 'Missing connectId',
        message: 'Connect configuration ID is required for updates'
      }, { status: 400 });
    }
    
    const result = await updateConnectConfiguration();
    
    return NextResponse.json({
      success: true,
      configuration: result,
      message: 'Connect configuration updated successfully'
    });
    
  } catch (error) {
    console.error('❌ Error updating Connect configuration:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage,
        message: 'Failed to update Connect configuration'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const connectId = searchParams.get('connectId');
    
    if (!connectId) {
      return NextResponse.json({
        success: false,
        error: 'Missing connectId',
        message: 'Connect configuration ID is required for deletion'
      }, { status: 400 });
    }
    
    await deleteConnectConfiguration();
    
    return NextResponse.json({
      success: true,
      message: 'Connect configuration deleted successfully'
    });
    
  } catch (error) {
    console.error('❌ Error deleting Connect configuration:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage,
        message: 'Failed to delete Connect configuration'
      },
      { status: 500 }
    );
  }
}