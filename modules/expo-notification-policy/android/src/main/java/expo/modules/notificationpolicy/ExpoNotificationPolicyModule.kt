package expo.modules.notificationpolicy

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.SystemClock
import android.provider.Settings
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.Promise

class ExpoNotificationPolicyModule : Module() {
    override fun definition() = ModuleDefinition {
        Name("ExpoNotificationPolicy")

        AsyncFunction("setBlockedPackages") { packages: List<String>, promise: Promise ->
            try {
                val context = appContext.reactContext ?: run {
                    promise.reject("ERR", "Context not available", null)
                    return@AsyncFunction
                }
                val prefs = context.getSharedPreferences("focuslock_notifications", Context.MODE_PRIVATE)
                prefs.edit()
                    .putStringSet("blocked_notification_packages", packages.toSet())
                    .apply()
                promise.resolve(true)
            } catch (e: Exception) {
                promise.reject("ERR", "Failed to set blocked packages: ${e.message}", e)
            }
        }

        AsyncFunction("scheduleRepeatingNudge") { intervalMinutes: Int, promise: Promise ->
            try {
                val context = appContext.reactContext ?: run {
                    promise.reject("ERR", "Context not available", null)
                    return@AsyncFunction
                }

                val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
                val intent = Intent(context, NudgeReceiver::class.java)
                val pendingIntent = PendingIntent.getBroadcast(
                    context, 0, intent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )

                val intervalMs = intervalMinutes.toLong() * 60 * 1000

                alarmManager.setInexactRepeating(
                    AlarmManager.ELAPSED_REALTIME_WAKEUP,
                    SystemClock.elapsedRealtime() + intervalMs,
                    intervalMs,
                    pendingIntent
                )

                // Save settings
                val prefs = context.getSharedPreferences("focuslock_nudge", Context.MODE_PRIVATE)
                prefs.edit()
                    .putBoolean("enabled", true)
                    .putInt("intervalMinutes", intervalMinutes)
                    .apply()

                promise.resolve(true)
            } catch (e: Exception) {
                promise.reject("ERR", "Failed to schedule nudge: ${e.message}", e)
            }
        }

        AsyncFunction("cancelNudge") { promise: Promise ->
            try {
                val context = appContext.reactContext ?: run {
                    promise.reject("ERR", "Context not available", null)
                    return@AsyncFunction
                }

                val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
                val intent = Intent(context, NudgeReceiver::class.java)
                val pendingIntent = PendingIntent.getBroadcast(
                    context, 0, intent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
                alarmManager.cancel(pendingIntent)

                val prefs = context.getSharedPreferences("focuslock_nudge", Context.MODE_PRIVATE)
                prefs.edit().putBoolean("enabled", false).apply()

                promise.resolve(true)
            } catch (e: Exception) {
                promise.reject("ERR", "Failed to cancel nudge: ${e.message}", e)
            }
        }

        AsyncFunction("sendTestNudge") { promise: Promise ->
            try {
                val context = appContext.reactContext ?: run {
                    promise.reject("ERR", "Context not available", null)
                    return@AsyncFunction
                }
                val intent = Intent(context, NudgeReceiver::class.java)
                context.sendBroadcast(intent)
                promise.resolve(true)
            } catch (e: Exception) {
                promise.reject("ERR", "Failed to send test nudge: ${e.message}", e)
            }
        }

        AsyncFunction("getNudgeSettings") { promise: Promise ->
            try {
                val context = appContext.reactContext ?: run {
                    promise.resolve(mapOf("enabled" to false, "intervalMinutes" to 120))
                    return@AsyncFunction
                }
                val prefs = context.getSharedPreferences("focuslock_nudge", Context.MODE_PRIVATE)
                promise.resolve(mapOf(
                    "enabled" to prefs.getBoolean("enabled", false),
                    "intervalMinutes" to prefs.getInt("intervalMinutes", 120)
                ))
            } catch (e: Exception) {
                promise.resolve(mapOf("enabled" to false, "intervalMinutes" to 120))
            }
        }

        AsyncFunction("isNotificationListenerEnabled") { promise: Promise ->
            try {
                val context = appContext.reactContext ?: run {
                    promise.resolve(false)
                    return@AsyncFunction
                }
                val flat = Settings.Secure.getString(
                    context.contentResolver,
                    "enabled_notification_listeners"
                ) ?: ""
                val componentName = ComponentName(context, NotificationBlockerService::class.java)
                val isEnabled = flat.contains(componentName.flattenToString())
                promise.resolve(isEnabled)
            } catch (e: Exception) {
                promise.resolve(false)
            }
        }

        AsyncFunction("openNotificationListenerSettings") { promise: Promise ->
            try {
                val context = appContext.reactContext ?: run {
                    promise.reject("ERR", "Context not available", null)
                    return@AsyncFunction
                }
                val intent = Intent("android.settings.ACTION_NOTIFICATION_LISTENER_SETTINGS")
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                context.startActivity(intent)
                promise.resolve(true)
            } catch (e: Exception) {
                promise.reject("ERR", "Failed to open settings: ${e.message}", e)
            }
        }
    }
}
