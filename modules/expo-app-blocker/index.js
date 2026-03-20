// Native module for app blocking via Accessibility Service
// Monitors foreground app and blocks paused apps

import { requireNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';

let ExpoAppBlocker = null;

try {
  ExpoAppBlocker = requireNativeModule('ExpoAppBlocker');
} catch (e) {
  console.warn('ExpoAppBlocker native module not available');
}

/**
 * Update the list of packages to block
 */
export async function setBlockedPackages(packages) {
  if (ExpoAppBlocker && Platform.OS === 'android') {
    try {
      return await ExpoAppBlocker.setBlockedPackages(packages);
    } catch (e) {
      console.warn('Failed to set blocked packages:', e);
    }
  }
}

/**
 * Get block attempt data for the last N days
 * Returns: Array of { date, packageName, count }
 */
export async function getBlockAttempts(daysBack = 7) {
  if (ExpoAppBlocker && Platform.OS === 'android') {
    try {
      return await ExpoAppBlocker.getBlockAttempts(daysBack);
    } catch (e) {
      console.warn('Failed to get block attempts:', e);
      return [];
    }
  }
  // Mock data for dev
  const today = new Date().toISOString().split('T')[0];
  return [
    { date: today, packageName: 'com.twitter.android', count: 8 },
    { date: today, packageName: 'com.zhiliaoapp.musically', count: 5 },
    { date: today, packageName: 'com.instagram.android', count: 3 },
  ];
}

/**
 * Get today's total block attempt count
 */
export async function getTodayTotalAttempts() {
  if (ExpoAppBlocker && Platform.OS === 'android') {
    try {
      return await ExpoAppBlocker.getTodayTotalAttempts();
    } catch (e) {
      console.warn('Failed to get today total attempts:', e);
      return 0;
    }
  }
  return 16; // Mock for dev
}

/**
 * Check if Accessibility Service is enabled
 */
export async function isAccessibilityServiceEnabled() {
  if (ExpoAppBlocker && Platform.OS === 'android') {
    try {
      return await ExpoAppBlocker.isAccessibilityServiceEnabled();
    } catch (e) {
      return false;
    }
  }
  return true; // Mock for dev
}

/**
 * Open Accessibility Settings
 */
export async function openAccessibilitySettings() {
  if (ExpoAppBlocker && Platform.OS === 'android') {
    try {
      return await ExpoAppBlocker.openAccessibilitySettings();
    } catch (e) {
      console.warn('Failed to open accessibility settings:', e);
    }
  }
}

/**
 * Save schedules to native SharedPreferences (JSON string)
 */
export async function setNativeSchedules(schedulesJson) {
  if (ExpoAppBlocker && Platform.OS === 'android') {
    try {
      return await ExpoAppBlocker.setSchedules(schedulesJson);
    } catch (e) {
      console.warn('Failed to set schedules:', e);
    }
  }
}

/**
 * Get schedules from native SharedPreferences
 * Returns: JSON string
 */
export async function getNativeSchedules() {
  if (ExpoAppBlocker && Platform.OS === 'android') {
    try {
      return await ExpoAppBlocker.getSchedules();
    } catch (e) {
      console.warn('Failed to get schedules:', e);
      return '[]';
    }
  }
  return '[]';
}

/**
 * Share text via Android's native share sheet
 */
export async function shareText(text) {
  if (ExpoAppBlocker && Platform.OS === 'android') {
    try {
      return await ExpoAppBlocker.shareText(text);
    } catch (e) {
      console.warn('Failed to share:', e);
    }
  }
}

/**
 * Set daily time limits per app (JSON object: { packageName: limitMinutes })
 */
export async function setDailyLimits(limitsObj) {
  if (ExpoAppBlocker && Platform.OS === 'android') {
    try {
      return await ExpoAppBlocker.setDailyLimits(JSON.stringify(limitsObj));
    } catch (e) {
      console.warn('Failed to set daily limits:', e);
    }
  }
}

/**
 * Get daily time limits per app
 */
export async function getDailyLimits() {
  if (ExpoAppBlocker && Platform.OS === 'android') {
    try {
      const json = await ExpoAppBlocker.getDailyLimits();
      return JSON.parse(json || '{}');
    } catch (e) {
      console.warn('Failed to get daily limits:', e);
    }
  }
  return {};
}

/**
 * Get today's cumulative foreground usage time per app (ms)
 */
export async function getDailyUsageTime() {
  if (ExpoAppBlocker && Platform.OS === 'android') {
    try {
      const json = await ExpoAppBlocker.getDailyUsageTime();
      return JSON.parse(json || '{}');
    } catch (e) {
      console.warn('Failed to get daily usage:', e);
    }
  }
  return {};
}

/**
 * Get today's open count per app
 */
export async function getAppOpenCounts() {
  if (ExpoAppBlocker && Platform.OS === 'android') {
    try {
      const json = await ExpoAppBlocker.getAppOpenCounts();
      return JSON.parse(json || '{}');
    } catch (e) {
      console.warn('Failed to get open counts:', e);
    }
  }
  return {};
}
