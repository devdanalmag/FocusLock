// Native module to list installed apps on Android
// Uses PackageManager API via Expo Modules

import { NativeModulesProxy, requireNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';

let ExpoAppManager = null;

try {
  ExpoAppManager = requireNativeModule('ExpoAppManager');
} catch (e) {
  // Fallback for dev/testing - provides sample data
  console.warn('ExpoAppManager native module not available, using mock data');
}

/**
 * Get list of all installed user applications
 * Returns: Array of { name, packageName, icon (base64) }
 */
export async function getInstalledApps() {
  if (ExpoAppManager && Platform.OS === 'android') {
    try {
      return await ExpoAppManager.getInstalledApps();
    } catch (e) {
      console.warn('Failed to get installed apps:', e);
      return getMockApps();
    }
  }
  return getMockApps();
}

/**
 * Get app usage stats for the last N days
 * Returns: Array of { packageName, appName, totalTimeMs, lastUsed }
 */
export async function getAppUsageStats(daysBack = 1) {
  if (ExpoAppManager && Platform.OS === 'android') {
    try {
      return await ExpoAppManager.getAppUsageStats(daysBack);
    } catch (e) {
      console.warn('Failed to get usage stats:', e);
      return getMockUsageStats();
    }
  }
  return getMockUsageStats();
}

/**
 * Get daily total usage for the last N days
 * Returns: Array of { date, totalTimeMs }
 */
export async function getDailyUsageTotals(daysBack = 7) {
  if (ExpoAppManager && Platform.OS === 'android') {
    try {
      return await ExpoAppManager.getDailyUsageTotals(daysBack);
    } catch (e) {
      console.warn('Failed to get daily totals:', e);
      return getMockDailyTotals();
    }
  }
  return getMockDailyTotals();
}

/**
 * Check if usage stats permission is granted
 */
export async function hasUsageStatsPermission() {
  if (ExpoAppManager && Platform.OS === 'android') {
    try {
      return await ExpoAppManager.hasUsageStatsPermission();
    } catch (e) {
      return false;
    }
  }
  return true; // Mock: always true for dev
}

/**
 * Open usage stats settings
 */
export async function openUsageStatsSettings() {
  if (ExpoAppManager && Platform.OS === 'android') {
    try {
      return await ExpoAppManager.openUsageStatsSettings();
    } catch (e) {
      console.warn('Failed to open usage stats settings:', e);
    }
  }
}

function getMockApps() {
  return [
    { name: 'Instagram', packageName: 'com.instagram.android', icon: null },
    { name: 'TikTok', packageName: 'com.zhiliaoapp.musically', icon: null },
    { name: 'Twitter / X', packageName: 'com.twitter.android', icon: null },
    { name: 'YouTube', packageName: 'com.google.android.youtube', icon: null },
    { name: 'Facebook', packageName: 'com.facebook.katana', icon: null },
    { name: 'Snapchat', packageName: 'com.snapchat.android', icon: null },
    { name: 'WhatsApp', packageName: 'com.whatsapp', icon: null },
    { name: 'Telegram', packageName: 'org.telegram.messenger', icon: null },
    { name: 'Reddit', packageName: 'com.reddit.frontpage', icon: null },
    { name: 'Netflix', packageName: 'com.netflix.mediaclient', icon: null },
    { name: 'Spotify', packageName: 'com.spotify.music', icon: null },
    { name: 'Discord', packageName: 'com.discord', icon: null },
    { name: 'Pinterest', packageName: 'com.pinterest', icon: null },
    { name: 'Twitch', packageName: 'tv.twitch.android.app', icon: null },
    { name: 'Chrome', packageName: 'com.android.chrome', icon: null },
    { name: 'Gmail', packageName: 'com.google.android.gm', icon: null },
    { name: 'Google Maps', packageName: 'com.google.android.apps.maps', icon: null },
    { name: 'Messenger', packageName: 'com.facebook.orca', icon: null },
    { name: 'Candy Crush', packageName: 'com.king.candycrushsaga', icon: null },
    { name: 'Clash of Clans', packageName: 'com.supercell.clashofclans', icon: null },
  ];
}

function getMockUsageStats() {
  return [
    { packageName: 'com.twitter.android', appName: 'Twitter / X', totalTimeMs: 4 * 60 * 60 * 1000, lastUsed: Date.now() },
    { packageName: 'com.whatsapp', appName: 'WhatsApp', totalTimeMs: 2 * 60 * 60 * 1000, lastUsed: Date.now() },
    { packageName: 'com.zhiliaoapp.musically', appName: 'TikTok', totalTimeMs: 1.5 * 60 * 60 * 1000, lastUsed: Date.now() },
    { packageName: 'com.google.android.youtube', appName: 'YouTube', totalTimeMs: 1 * 60 * 60 * 1000, lastUsed: Date.now() },
    { packageName: 'com.instagram.android', appName: 'Instagram', totalTimeMs: 45 * 60 * 1000, lastUsed: Date.now() },
    { packageName: 'com.android.chrome', appName: 'Chrome', totalTimeMs: 30 * 60 * 1000, lastUsed: Date.now() },
  ];
}

function getMockDailyTotals() {
  const result = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    result.push({
      date: d.toISOString().split('T')[0],
      totalTimeMs: Math.floor((3 + Math.random() * 8) * 60 * 60 * 1000),
    });
  }
  return result;
}

