package expo.modules.deviceadmin

import android.app.admin.DeviceAdminReceiver
import android.content.Context
import android.content.Intent

/**
 * Device Admin Receiver — required to register as Device Administrator.
 * Prevents FocusLock from being uninstalled while it's an active admin.
 */
class FocusLockDeviceAdminReceiver : DeviceAdminReceiver() {
    override fun onEnabled(context: Context, intent: Intent) {
        super.onEnabled(context, intent)
    }

    override fun onDisabled(context: Context, intent: Intent) {
        super.onDisabled(context, intent)
    }

    override fun onDisableRequested(context: Context, intent: Intent): CharSequence {
        return "Warning: Disabling device admin will allow FocusLock to be uninstalled. Your paused apps will no longer be locked."
    }
}
