// Notification Policy module — blocks notifications from paused apps
import { requireNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';

let ExpoNotificationPolicy = null;

try {
  ExpoNotificationPolicy = requireNativeModule('ExpoNotificationPolicy');
} catch (e) {
  console.warn('ExpoNotificationPolicy native module not available');
}

export async function setBlockedNotificationPackages(packages) {
  if (ExpoNotificationPolicy && Platform.OS === 'android') {
    try {
      return await ExpoNotificationPolicy.setBlockedPackages(packages);
    } catch (e) {
      console.warn('Failed to set blocked notification packages:', e);
    }
  }
}

export async function isNotificationListenerEnabled() {
  if (ExpoNotificationPolicy && Platform.OS === 'android') {
    try {
      return await ExpoNotificationPolicy.isNotificationListenerEnabled();
    } catch (e) {
      return false;
    }
  }
  return true;
}

export async function openNotificationListenerSettings() {
  if (ExpoNotificationPolicy && Platform.OS === 'android') {
    try {
      return await ExpoNotificationPolicy.openNotificationListenerSettings();
    } catch (e) {
      console.warn('Failed to open notification listener settings:', e);
    }
  }
}

/**
 * Schedule repeating nudge notifications
 * @param intervalMinutes - How often to nudge (e.g., 60, 120, 240)
 */
export async function scheduleRepeatingNudge(intervalMinutes) {
  if (ExpoNotificationPolicy && Platform.OS === 'android') {
    try {
      return await ExpoNotificationPolicy.scheduleRepeatingNudge(intervalMinutes);
    } catch (e) {
      console.warn('Failed to schedule nudge:', e);
    }
  }
}

/**
 * Cancel nudge notifications
 */
export async function cancelNudge() {
  if (ExpoNotificationPolicy && Platform.OS === 'android') {
    try {
      return await ExpoNotificationPolicy.cancelNudge();
    } catch (e) {
      console.warn('Failed to cancel nudge:', e);
    }
  }
}

/**
 * Send a test nudge notification immediately
 */
export async function sendTestNudge() {
  if (ExpoNotificationPolicy && Platform.OS === 'android') {
    try {
      return await ExpoNotificationPolicy.sendTestNudge();
    } catch (e) {
      console.warn('Failed to send test nudge:', e);
    }
  }
}

/**
 * Get nudge settings
 * Returns: { enabled, intervalMinutes }
 */
export async function getNudgeSettings() {
  if (ExpoNotificationPolicy && Platform.OS === 'android') {
    try {
      return await ExpoNotificationPolicy.getNudgeSettings();
    } catch (e) {
      return { enabled: false, intervalMinutes: 120 };
    }
  }
  return { enabled: false, intervalMinutes: 120 };
}
