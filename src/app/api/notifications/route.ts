import { NextRequest, NextResponse } from 'next/server';
import { getAllNotifications, addNotification, markNotificationRead, markAllNotificationsRead } from '@/utils/notification-store';


export async function GET() {
  try {
    // Use in-memory store for now
    const notifications = getAllNotifications();
    return NextResponse.json(notifications);
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const {
      type,
      title,
      message,
      related_id,
      related_table
    } = body;

    // Validate required fields
    if (!type || !title || !message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create notification using in-memory store
    const notification = addNotification({
      type,
      title,
      message,
      related_id,
      related_table,
      read: false
    });

    return NextResponse.json(notification, { status: 201 });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Mark notification as read
export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const notificationId = searchParams.get('id');
    const action = searchParams.get('action');

    if (action === 'mark_read') {
      if (!notificationId) {
        return NextResponse.json(
          { error: 'Notification ID is required' },
          { status: 400 }
        );
      }

      const success = markNotificationRead(parseInt(notificationId));
      if (!success) {
        return NextResponse.json(
          { error: 'Notification not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({ message: 'Notification marked as read' });
    }

    if (action === 'mark_all_read') {
      markAllNotificationsRead();
      return NextResponse.json({ message: 'All notifications marked as read' });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

