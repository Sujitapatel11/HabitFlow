import { Injectable, signal } from '@angular/core';

export interface AppNotification {
  id: string;
  message: string;
  type: 'reminder' | 'success' | 'info';
  read: boolean;
  timestamp: Date;
}

/**
 * Notification Service
 * Manages in-app notifications and browser push notifications.
 */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  notifications = signal<AppNotification[]>([]);
  unreadCount = signal(0);

  /** Request browser notification permission */
  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    const result = await Notification.requestPermission();
    return result === 'granted';
  }

  /** Send a browser push notification */
  async sendBrowserNotification(title: string, body: string): Promise<void> {
    const granted = await this.requestPermission();
    if (!granted) return;

    new Notification(title, {
      body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
    });
  }

  /** Add an in-app notification */
  addNotification(message: string, type: AppNotification['type'] = 'info'): void {
    const notification: AppNotification = {
      id: crypto.randomUUID(),
      message,
      type,
      read: false,
      timestamp: new Date(),
    };

    this.notifications.update((list) => [notification, ...list].slice(0, 20));
    this.updateUnreadCount();
  }

  /** Mark all notifications as read */
  markAllRead(): void {
    this.notifications.update((list) => list.map((n) => ({ ...n, read: true })));
    this.unreadCount.set(0);
  }

  /** Clear all notifications */
  clearAll(): void {
    this.notifications.set([]);
    this.unreadCount.set(0);
  }

  private updateUnreadCount(): void {
    this.unreadCount.set(this.notifications().filter((n) => !n.read).length);
  }
}
