/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { NotificationSettings } from '../types';

// Check if browser notifications are supported
export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

// Request permission for browser notifications
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isNotificationSupported()) {
    return 'denied';
  }
  
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (e) {
    console.error('Error requesting notification permission:', e);
    return 'default';
  }
}

// Get current permission status
export function getNotificationPermissionStatus(): NotificationPermission {
  if (!isNotificationSupported()) {
    return 'denied';
  }
  return Notification.permission;
}

// Play notification sound (optional audio cue for in-app or browser notification)
export function playNotificationSound() {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Create oscillator
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    
    osc.connect(gain);
    gain.connect(audioContext.destination);
    
    // Gentle minimalist synth notification chime
    osc.type = 'sine';
    
    // Dynamic frequencies for a clean double chime
    const now = audioContext.currentTime;
    osc.frequency.setValueAtTime(523.25, now); // C5
    osc.frequency.setValueAtTime(659.25, now + 0.12,); // E5
    
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
    
    osc.start(now);
    osc.stop(now + 0.4);
  } catch (e) {
    console.warn('Audio feedback failed or was blocked by browser autoplay policy:', e);
  }
}

// Show a browser notification
export function showBrowserNotification(title: string, body: string, iconUrl?: string) {
  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return false;
  }

  try {
    const options: NotificationOptions = {
      body,
      icon: iconUrl || 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=128&h=128&q=80',
      badge: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=128&h=128&q=80',
      tag: 'yati-magang-reminder',
      requireInteraction: true
    };

    const notification = new Notification(title, options);
    playNotificationSound();

    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    return true;
  } catch (e) {
    console.error('Failed to display browser notification:', e);
    return false;
  }
}

// Trigger test notification
export function triggerTestNotification() {
  return showBrowserNotification(
    'Yati Magang 📝',
    'Notifikasi pengingat berhasil diaktifkan! Kami akan mengingatkan Anda setiap akhir hari kerja.'
  );
}

// Check if a reminder should be triggered now
export function checkAndTriggerReminder(
  settings: NotificationSettings,
  hasFilledToday: boolean,
  onTriggerInApp: (title: string, body: string) => void
): { triggered: boolean; updatedSettings?: NotificationSettings } {
  if (!settings.enabled) {
    return { triggered: false };
  }

  const todayStr = new Date().toISOString().split('T')[0];

  // Already notified today, or already filled today
  if (settings.lastNotifiedDate === todayStr || hasFilledToday) {
    return { triggered: false };
  }

  // Check if it's currently a weekday (Senin - Jumat)
  const currentDay = new Date().getDay();
  const isWeekend = currentDay === 0 || currentDay === 6;
  if (isWeekend) {
    return { triggered: false };
  }

  // Check time
  const now = new Date();
  const currentHours = now.getHours();
  const currentMinutes = now.getMinutes();

  const [targetHours, targetMinutes] = settings.time.split(':').map(Number);

  // If we've passed the target time today
  if (currentHours > targetHours || (currentHours === targetHours && currentMinutes >= targetMinutes)) {
    const title = 'Pengingat Logbook Yati Magang 📝';
    const body = 'Halo! Jangan lupa untuk mencatat aktivitas magang Anda hari ini. Klik di sini untuk mengisi!';
    
    // Show browser notification if possible
    const browserNotified = showBrowserNotification(title, body);
    
    // Always trigger in-app notification state
    onTriggerInApp(title, body);

    // Update settings with lastNotifiedDate to prevent spamming
    const updatedSettings: NotificationSettings = {
      ...settings,
      lastNotifiedDate: todayStr
    };

    return { triggered: true, updatedSettings };
  }

  return { triggered: false };
}
