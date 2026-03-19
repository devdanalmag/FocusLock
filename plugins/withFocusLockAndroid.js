/**
 * Expo Config Plugin for FocusLock
 * Adds all required Android services, receivers, and permissions to AndroidManifest.xml
 */
const { withAndroidManifest } = require('expo/config-plugins');

function withFocusLockAndroid(config) {
  return withAndroidManifest(config, async (config) => {
    const manifest = config.modResults;
    const application = manifest.manifest.application[0];

    // Add QUERY_ALL_PACKAGES permission
    if (!manifest.manifest['uses-permission']) {
      manifest.manifest['uses-permission'] = [];
    }

    const permissionsToAdd = [
      'android.permission.QUERY_ALL_PACKAGES',
      'android.permission.PACKAGE_USAGE_STATS',
      'android.permission.SYSTEM_ALERT_WINDOW',
      'android.permission.FOREGROUND_SERVICE',
      'android.permission.RECEIVE_BOOT_COMPLETED',
      'android.permission.POST_NOTIFICATIONS',
      'android.permission.SCHEDULE_EXACT_ALARM',
    ];

    permissionsToAdd.forEach((perm) => {
      const exists = manifest.manifest['uses-permission'].some(
        (p) => p.$['android:name'] === perm
      );
      if (!exists) {
        manifest.manifest['uses-permission'].push({
          $: { 'android:name': perm },
        });
      }
    });

    // Add Accessibility Service
    if (!application.service) {
      application.service = [];
    }

    application.service.push({
      $: {
        'android:name': 'expo.modules.appblocker.AppBlockerAccessibilityService',
        'android:permission': 'android.permission.BIND_ACCESSIBILITY_SERVICE',
        'android:exported': 'false',
      },
      'intent-filter': [
        {
          action: [
            {
              $: {
                'android:name': 'android.accessibilityservice.AccessibilityService',
              },
            },
          ],
        },
      ],
      'meta-data': [
        {
          $: {
            'android:name': 'android.accessibilityservice',
            'android:resource': '@xml/accessibility_service_config',
          },
        },
      ],
    });

    // Add Notification Listener Service
    application.service.push({
      $: {
        'android:name': 'expo.modules.notificationpolicy.NotificationBlockerService',
        'android:permission': 'android.permission.BIND_NOTIFICATION_LISTENER_SERVICE',
        'android:exported': 'false',
      },
      'intent-filter': [
        {
          action: [
            {
              $: {
                'android:name':
                  'android.service.notification.NotificationListenerService',
              },
            },
          ],
        },
      ],
    });

    // Add Device Admin Receiver
    if (!application.receiver) {
      application.receiver = [];
    }

    application.receiver.push({
      $: {
        'android:name': 'expo.modules.deviceadmin.FocusLockDeviceAdminReceiver',
        'android:permission': 'android.permission.BIND_DEVICE_ADMIN',
        'android:exported': 'true',
      },
      'meta-data': [
        {
          $: {
            'android:name': 'android.app.device_admin',
            'android:resource': '@xml/device_admin_policies',
          },
        },
      ],
      'intent-filter': [
        {
          action: [
            {
              $: {
                'android:name': 'android.app.action.DEVICE_ADMIN_ENABLED',
              },
            },
          ],
        },
      ],
    });

    // Add NudgeReceiver for reality check notifications
    application.receiver.push({
      $: {
        'android:name': 'expo.modules.notificationpolicy.NudgeReceiver',
        'android:exported': 'false',
      },
    });

    // Add BlockedAppActivity
    if (!application.activity) {
      application.activity = [];
    }

    application.activity.push({
      $: {
        'android:name': 'expo.modules.appblocker.BlockedAppActivity',
        'android:theme': '@android:style/Theme.NoTitleBar.Fullscreen',
        'android:exported': 'false',
        'android:launchMode': 'singleTop',
        'android:taskAffinity': '',
        'android:excludeFromRecents': 'true',
      },
    });

    return config;
  });
}

module.exports = withFocusLockAndroid;
