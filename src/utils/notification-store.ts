// In-memory notification store for testing
// In production, this would be replaced with a database

interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  icon: string;
  related_id?: string;
  related_table?: string;
}

let notificationCounter = 1;
let notifications: Notification[] = [
  {
    id: notificationCounter++,
    type: 'new_application',
    title: 'New Loan Application',
    message: 'Recent loan application submitted',
    timestamp: new Date(Date.now() - 1000 * 60 * 30),
    read: false,
    icon: 'plus'
  }
];

export function getAllNotifications(): Notification[] {
  return notifications.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}

export function addNotification(notification: Omit<Notification, 'id' | 'timestamp' | 'icon'>): Notification {
  const newNotification: Notification = {
    ...notification,
    id: notificationCounter++,
    timestamp: new Date(),
    icon: getIconForType(notification.type)
  };
  
  notifications.unshift(newNotification);
  
  // Keep only the latest 50 notifications
  if (notifications.length > 50) {
    notifications = notifications.slice(0, 50);
  }
  
  return newNotification;
}

export function markNotificationRead(id: number): boolean {
  const notification = notifications.find(n => n.id === id);
  if (notification) {
    notification.read = true;
    return true;
  }
  return false;
}

export function markAllNotificationsRead(): void {
  notifications.forEach(n => n.read = true);
}

function getIconForType(type: string): string {
  switch (type) {
    case 'new_application':
    case 'loan_created':
      return 'plus';
    case 'document_signed':
    case 'loan_approved':
      return 'check';
    case 'kyc_pending':
    case 'payment_due':
      return 'alert';
    case 'payment_received':
      return 'check';
    default:
      return 'clock';
  }
}