// Device Admin module — prevents FocusLock from being uninstalled
import { requireNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';

let ExpoDeviceAdmin = null;

try {
  ExpoDeviceAdmin = requireNativeModule('ExpoDeviceAdmin');
} catch (e) {
  console.warn('ExpoDeviceAdmin native module not available');
}

/**
 * Request Device Admin privileges
 */
export async function requestDeviceAdmin() {
  if (ExpoDeviceAdmin && Platform.OS === 'android') {
    try {
      return await ExpoDeviceAdmin.requestDeviceAdmin();
    } catch (e) {
      console.warn('Failed to request device admin:', e);
      return false;
    }
  }
  return true;
}

/**
 * Check if app is Device Admin
 */
export async function isDeviceAdmin() {
  if (ExpoDeviceAdmin && Platform.OS === 'android') {
    try {
      return await ExpoDeviceAdmin.isDeviceAdmin();
    } catch (e) {
      return false;
    }
  }
  return true;
}
