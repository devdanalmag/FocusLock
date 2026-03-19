package expo.modules.appblocker

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.AccessibilityServiceInfo
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.provider.Settings
import android.text.TextUtils
import android.view.accessibility.AccessibilityEvent
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.Promise
import java.text.SimpleDateFormat
import java.util.*

class ExpoAppBlockerModule : Module() {
    override fun definition() = ModuleDefinition {
        Name("ExpoAppBlocker")

        AsyncFunction("setBlockedPackages") { packages: List<String>, promise: Promise ->
            try {
                val context = appContext.reactContext ?: run {
                    promise.reject("ERR", "Context not available", null)
                    return@AsyncFunction
                }
                val prefs = context.getSharedPreferences("focuslock_blocked", Context.MODE_PRIVATE)
                prefs.edit()
                    .putStringSet("blocked_packages", packages.toSet())
                    .apply()
                promise.resolve(true)
            } catch (e: Exception) {
                promise.reject("ERR", "Failed to set blocked packages: ${e.message}", e)
            }
        }

        AsyncFunction("getBlockAttempts") { daysBack: Int, promise: Promise ->
            try {
                val context = appContext.reactContext ?: run {
                    promise.resolve(emptyList<Map<String, Any>>())
                    return@AsyncFunction
                }
                val prefs = context.getSharedPreferences("focuslock_attempts", Context.MODE_PRIVATE)
                val dateFormat = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
                val allEntries = prefs.all
                val result = mutableListOf<Map<String, Any>>()

                // Collect data for the last N days
                for (day in 0 until daysBack) {
                    val cal = Calendar.getInstance()
                    cal.add(Calendar.DAY_OF_YEAR, -day)
                    val dateStr = dateFormat.format(cal.time)

                    // Find all entries for this date
                    for ((key, value) in allEntries) {
                        if (key.startsWith("attempts_${dateStr}_") && value is Int && value > 0) {
                            val packageName = key.removePrefix("attempts_${dateStr}_")
                            result.add(mapOf(
                                "date" to dateStr,
                                "packageName" to packageName,
                                "count" to value
                            ))
                        }
                    }
                }

                promise.resolve(result)
            } catch (e: Exception) {
                promise.reject("ERR", "Failed to get block attempts: ${e.message}", e)
            }
        }

        AsyncFunction("getTodayTotalAttempts") { promise: Promise ->
            try {
                val context = appContext.reactContext ?: run {
                    promise.resolve(0)
                    return@AsyncFunction
                }
                val prefs = context.getSharedPreferences("focuslock_attempts", Context.MODE_PRIVATE)
                val dateFormat = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
                val today = dateFormat.format(Date())
                val totalKey = "total_attempts_${today}"
                promise.resolve(prefs.getInt(totalKey, 0))
            } catch (e: Exception) {
                promise.resolve(0)
            }
        }

        AsyncFunction("setSchedules") { schedulesJson: String, promise: Promise ->
            try {
                val context = appContext.reactContext ?: run {
                    promise.reject("ERR", "Context not available", null)
                    return@AsyncFunction
                }
                val prefs = context.getSharedPreferences("focuslock_schedules", Context.MODE_PRIVATE)
                prefs.edit().putString("schedules", schedulesJson).apply()
                promise.resolve(true)
            } catch (e: Exception) {
                promise.reject("ERR", "Failed to set schedules: ${e.message}", e)
            }
        }

        AsyncFunction("getSchedules") { promise: Promise ->
            try {
                val context = appContext.reactContext ?: run {
                    promise.resolve("[]")
                    return@AsyncFunction
                }
                val prefs = context.getSharedPreferences("focuslock_schedules", Context.MODE_PRIVATE)
                promise.resolve(prefs.getString("schedules", "[]"))
            } catch (e: Exception) {
                promise.resolve("[]")
            }
        }

        AsyncFunction("isAccessibilityServiceEnabled") { promise: Promise ->
            try {
                val context = appContext.reactContext ?: run {
                    promise.resolve(false)
                    return@AsyncFunction
                }
                val serviceName = "${context.packageName}/${AppBlockerAccessibilityService::class.java.canonicalName}"
                val enabledServices = Settings.Secure.getString(
                    context.contentResolver,
                    Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
                ) ?: ""
                val isEnabled = enabledServices.split(':').any { 
                    it.equals(serviceName, ignoreCase = true) 
                }
                promise.resolve(isEnabled)
            } catch (e: Exception) {
                promise.resolve(false)
            }
        }

        AsyncFunction("openAccessibilitySettings") { promise: Promise ->
            try {
                val context = appContext.reactContext ?: run {
                    promise.reject("ERR", "Context not available", null)
                    return@AsyncFunction
                }
                val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                context.startActivity(intent)
                promise.resolve(true)
            } catch (e: Exception) {
                promise.reject("ERR", "Failed to open settings: ${e.message}", e)
            }
        }

        AsyncFunction("shareText") { text: String, promise: Promise ->
            try {
                val context = appContext.reactContext ?: run {
                    promise.reject("ERR", "Context not available", null)
                    return@AsyncFunction
                }
                val intent = Intent(Intent.ACTION_SEND).apply {
                    type = "text/plain"
                    putExtra(Intent.EXTRA_TEXT, text)
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                val chooser = Intent.createChooser(intent, "Share Focus Stats")
                chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                context.startActivity(chooser)
                promise.resolve(true)
            } catch (e: Exception) {
                promise.reject("ERR", "Failed to share: ${e.message}", e)
            }
        }
    }
}
