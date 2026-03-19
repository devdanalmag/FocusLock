package expo.modules.appblocker

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.AccessibilityServiceInfo
import android.content.Context
import android.content.Intent
import android.view.accessibility.AccessibilityEvent
import org.json.JSONArray
import java.text.SimpleDateFormat
import java.util.*

/**
 * Accessibility Service that monitors foreground app changes.
 * Blocks apps from two sources:
 *  1. Permanent block list (paused apps with timer)
 *  2. Time-based schedules (e.g., block Twitter 8am-6pm on weekdays)
 */
class AppBlockerAccessibilityService : AccessibilityService() {

    override fun onServiceConnected() {
        super.onServiceConnected()
        val info = AccessibilityServiceInfo().apply {
            eventTypes = AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED
            feedbackType = AccessibilityServiceInfo.FEEDBACK_GENERIC
            notificationTimeout = 100
            flags = AccessibilityServiceInfo.FLAG_INCLUDE_NOT_IMPORTANT_VIEWS
        }
        serviceInfo = info
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (event?.eventType == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) {
            val packageName = event.packageName?.toString() ?: return
            
            // Don't block our own app or system UI
            if (packageName == applicationContext.packageName ||
                packageName == "com.android.launcher" ||
                packageName == "com.android.launcher3" ||
                packageName == "com.google.android.apps.nexuslauncher" ||
                packageName == "com.android.systemui" ||
                packageName == "com.android.settings") {
                return
            }

            // Check 1: Permanent block list
            val prefs = applicationContext.getSharedPreferences("focuslock_blocked", Context.MODE_PRIVATE)
            val blockedPackages = prefs.getStringSet("blocked_packages", emptySet()) ?: emptySet()

            if (blockedPackages.contains(packageName)) {
                blockApp(packageName, "paused")
                return
            }

            // Check 2: Time-based schedules
            if (isBlockedBySchedule(packageName)) {
                blockApp(packageName, "scheduled")
                return
            }
        }
    }

    /**
     * Block an app — track attempt, go home, show blocked screen.
     */
    private fun blockApp(packageName: String, reason: String) {
        trackBlockAttempt(packageName)
        performGlobalAction(GLOBAL_ACTION_HOME)
        try {
            val intent = Intent(applicationContext, BlockedAppActivity::class.java).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
                putExtra("blocked_package", packageName)
                putExtra("block_reason", reason)
            }
            applicationContext.startActivity(intent)
        } catch (e: Exception) {
            performGlobalAction(GLOBAL_ACTION_HOME)
        }
    }

    /**
     * Check if a package is blocked by any active schedule right now.
     * Schedules are stored as JSON array in SharedPreferences.
     */
    private fun isBlockedBySchedule(packageName: String): Boolean {
        try {
            val prefs = applicationContext.getSharedPreferences("focuslock_schedules", Context.MODE_PRIVATE)
            val schedulesJson = prefs.getString("schedules", "[]") ?: "[]"
            val schedules = JSONArray(schedulesJson)

            val calendar = Calendar.getInstance()
            val currentHour = calendar.get(Calendar.HOUR_OF_DAY)
            val currentMinute = calendar.get(Calendar.MINUTE)
            // Calendar.DAY_OF_WEEK: Sunday=1, Monday=2, ..., Saturday=7
            val currentDay = calendar.get(Calendar.DAY_OF_WEEK)

            for (i in 0 until schedules.length()) {
                val schedule = schedules.getJSONObject(i)

                if (!schedule.optBoolean("enabled", true)) continue

                // Check if this schedule applies to this package
                val packages = schedule.optJSONArray("packages") ?: continue
                var matchesPackage = false
                for (j in 0 until packages.length()) {
                    if (packages.getString(j) == packageName) {
                        matchesPackage = true
                        break
                    }
                }
                if (!matchesPackage) continue

                // Check if today is an active day
                val daysOfWeek = schedule.optJSONArray("daysOfWeek") ?: continue
                var matchesDay = false
                for (j in 0 until daysOfWeek.length()) {
                    if (daysOfWeek.getInt(j) == currentDay) {
                        matchesDay = true
                        break
                    }
                }
                if (!matchesDay) continue

                // Check time range
                val startHour = schedule.optInt("startHour", 0)
                val startMinute = schedule.optInt("startMinute", 0)
                val endHour = schedule.optInt("endHour", 23)
                val endMinute = schedule.optInt("endMinute", 59)

                val currentTimeMinutes = currentHour * 60 + currentMinute
                val startTimeMinutes = startHour * 60 + startMinute
                val endTimeMinutes = endHour * 60 + endMinute

                if (startTimeMinutes <= endTimeMinutes) {
                    // Same-day range (e.g., 8:00–18:00)
                    if (currentTimeMinutes in startTimeMinutes until endTimeMinutes) {
                        return true
                    }
                } else {
                    // Overnight range (e.g., 22:00–06:00)
                    if (currentTimeMinutes >= startTimeMinutes || currentTimeMinutes < endTimeMinutes) {
                        return true
                    }
                }
            }
        } catch (e: Exception) {
            // Don't crash the service
        }
        return false
    }

    /**
     * Increment the block attempt counter for a package, keyed by today's date.
     */
    private fun trackBlockAttempt(packageName: String) {
        try {
            val prefs = applicationContext.getSharedPreferences("focuslock_attempts", Context.MODE_PRIVATE)
            val dateFormat = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
            val today = dateFormat.format(Date())
            val key = "attempts_${today}_${packageName}"
            val current = prefs.getInt(key, 0)
            prefs.edit().putInt(key, current + 1).apply()

            val totalKey = "total_attempts_${today}"
            val totalCurrent = prefs.getInt(totalKey, 0)
            prefs.edit().putInt(totalKey, totalCurrent + 1).apply()
        } catch (e: Exception) {
            // Silently fail
        }
    }

    override fun onInterrupt() {}
}
