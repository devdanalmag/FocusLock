package expo.modules.deviceadmin

import android.app.admin.DeviceAdminReceiver
import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.Promise

class ExpoDeviceAdminModule : Module() {
    override fun definition() = ModuleDefinition {
        Name("ExpoDeviceAdmin")

        AsyncFunction("requestDeviceAdmin") { promise: Promise ->
            try {
                val context = appContext.reactContext ?: run {
                    promise.reject("ERR", "Context not available", null)
                    return@AsyncFunction
                }
                val componentName = ComponentName(context, FocusLockDeviceAdminReceiver::class.java)
                val intent = Intent(DevicePolicyManager.ACTION_ADD_DEVICE_ADMIN).apply {
                    putExtra(DevicePolicyManager.EXTRA_DEVICE_ADMIN, componentName)
                    putExtra(
                        DevicePolicyManager.EXTRA_ADD_EXPLANATION,
                        "FocusLock needs device admin access to prevent uninstallation during your focus periods. This ensures the lock cannot be bypassed."
                    )
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                context.startActivity(intent)
                promise.resolve(true)
            } catch (e: Exception) {
                promise.reject("ERR", "Failed to request device admin: ${e.message}", e)
            }
        }

        AsyncFunction("isDeviceAdmin") { promise: Promise ->
            try {
                val context = appContext.reactContext ?: run {
                    promise.resolve(false)
                    return@AsyncFunction
                }
                val dpm = context.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
                val componentName = ComponentName(context, FocusLockDeviceAdminReceiver::class.java)
                promise.resolve(dpm.isAdminActive(componentName))
            } catch (e: Exception) {
                promise.resolve(false)
            }
        }
    }
}
