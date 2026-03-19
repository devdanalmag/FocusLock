package expo.modules.notificationpolicy

import android.content.Context
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification

/**
 * Notification Listener Service that dismisses notifications from blocked/paused apps.
 */
class NotificationBlockerService : NotificationListenerService() {

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        super.onNotificationPosted(sbn)
        
        if (sbn == null) return

        val packageName = sbn.packageName ?: return

        val prefs = applicationContext.getSharedPreferences("focuslock_notifications", Context.MODE_PRIVATE)
        val blockedPackages = prefs.getStringSet("blocked_notification_packages", emptySet()) ?: emptySet()

        if (blockedPackages.contains(packageName)) {
            try {
                cancelNotification(sbn.key)
            } catch (e: Exception) {
                // Silently fail — notification might have been removed already
            }
        }
    }

    override fun onNotificationRemoved(sbn: StatusBarNotification?) {
        super.onNotificationRemoved(sbn)
    }
}
