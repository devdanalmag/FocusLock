package expo.modules.appblocker

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.AccessibilityServiceInfo
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.Typeface
import android.os.Handler
import android.os.Looper
import android.util.TypedValue
import android.view.Gravity
import android.view.WindowManager
import android.view.accessibility.AccessibilityEvent
import android.widget.LinearLayout
import android.widget.TextView
import org.json.JSONArray
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.*

/**
 * Accessibility Service that monitors foreground app changes.
 * Blocks apps from three sources:
 *  1. Permanent block list (paused apps with timer)
 *  2. Time-based schedules (e.g., block Twitter 8am-6pm on weekdays)
 *  3. Daily time limits (e.g., max 1h of Instagram per day)
 *
 * Also tracks:
 *  - Cumulative foreground time per app per day
 *  - Open count per app per day
 *  - Shows overlay banner every 5 min with remaining time for limited apps
 */
class AppBlockerAccessibilityService : AccessibilityService() {

    private var lastForegroundPackage: String? = null
    private var lastForegroundTime: Long = 0L

    // Overlay banner system
    private val handler = Handler(Looper.getMainLooper())
    private var overlayView: LinearLayout? = null
    private var lastBannerTime: Long = 0L
    private val BANNER_INTERVAL_MS = 5 * 60 * 1000L  // 5 minutes

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
                // Still record time for the previous app before returning
                recordForegroundTime(packageName)
                return
            }

            // Record time spent in the previous foreground app
            recordForegroundTime(packageName)

            // Track open count for this app
            trackAppOpen(packageName)

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

            // Check 3: Daily time limits
            if (isOverDailyLimit(packageName)) {
                blockApp(packageName, "time_limit")
                return
            }

            // Show remaining time banner for limited apps
            checkAndShowBanner(packageName)
        }
    }

    /**
     * Record foreground time for the previous app when switching to a new one.
     */
    private fun recordForegroundTime(newPackage: String) {
        val now = System.currentTimeMillis()
        val prevPackage = lastForegroundPackage
        val prevTime = lastForegroundTime

        // Update for next call
        lastForegroundPackage = newPackage
        lastForegroundTime = now

        if (prevPackage != null && prevTime > 0 && prevPackage != newPackage) {
            val durationMs = now - prevTime
            // Only record reasonable durations (< 30 min per single session)
            if (durationMs in 1..1_800_000) {
                val prefs = applicationContext.getSharedPreferences("focuslock_usage_time", Context.MODE_PRIVATE)
                val dateFormat = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
                val today = dateFormat.format(Date())
                val key = "usage_${today}_${prevPackage}"
                val current = prefs.getLong(key, 0L)
                prefs.edit().putLong(key, current + durationMs).apply()
            }
        }
    }

    /**
     * Track app open count per day.
     */
    private fun trackAppOpen(packageName: String) {
        try {
            val prefs = applicationContext.getSharedPreferences("focuslock_usage_time", Context.MODE_PRIVATE)
            val dateFormat = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
            val today = dateFormat.format(Date())
            val key = "opens_${today}_${packageName}"
            val current = prefs.getInt(key, 0)
            prefs.edit().putInt(key, current + 1).apply()
        } catch (e: Exception) {}
    }

    /**
     * Check if an app has exceeded its daily time limit.
     */
    private fun isOverDailyLimit(packageName: String): Boolean {
        try {
            val limitsPrefs = applicationContext.getSharedPreferences("focuslock_daily_limits", Context.MODE_PRIVATE)
            val limitsJson = limitsPrefs.getString("limits", "{}") ?: "{}"
            val limits = JSONObject(limitsJson)

            if (!limits.has(packageName)) return false

            val limitMinutes = limits.getInt(packageName)
            val limitMs = limitMinutes.toLong() * 60 * 1000

            val usagePrefs = applicationContext.getSharedPreferences("focuslock_usage_time", Context.MODE_PRIVATE)
            val dateFormat = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
            val today = dateFormat.format(Date())
            val key = "usage_${today}_${packageName}"
            val usedMs = usagePrefs.getLong(key, 0L)

            return usedMs >= limitMs
        } catch (e: Exception) {
            return false
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
     */
    private fun isBlockedBySchedule(packageName: String): Boolean {
        try {
            val prefs = applicationContext.getSharedPreferences("focuslock_schedules", Context.MODE_PRIVATE)
            val schedulesJson = prefs.getString("schedules", "[]") ?: "[]"
            val schedules = JSONArray(schedulesJson)

            val calendar = Calendar.getInstance()
            val currentHour = calendar.get(Calendar.HOUR_OF_DAY)
            val currentMinute = calendar.get(Calendar.MINUTE)
            val currentDay = calendar.get(Calendar.DAY_OF_WEEK)

            for (i in 0 until schedules.length()) {
                val schedule = schedules.getJSONObject(i)

                if (!schedule.optBoolean("enabled", true)) continue

                val packages = schedule.optJSONArray("packages") ?: continue
                var matchesPackage = false
                for (j in 0 until packages.length()) {
                    if (packages.getString(j) == packageName) {
                        matchesPackage = true
                        break
                    }
                }
                if (!matchesPackage) continue

                val daysOfWeek = schedule.optJSONArray("daysOfWeek") ?: continue
                var matchesDay = false
                for (j in 0 until daysOfWeek.length()) {
                    if (daysOfWeek.getInt(j) == currentDay) {
                        matchesDay = true
                        break
                    }
                }
                if (!matchesDay) continue

                val startHour = schedule.optInt("startHour", 0)
                val startMinute = schedule.optInt("startMinute", 0)
                val endHour = schedule.optInt("endHour", 23)
                val endMinute = schedule.optInt("endMinute", 59)

                val currentTimeMinutes = currentHour * 60 + currentMinute
                val startTimeMinutes = startHour * 60 + startMinute
                val endTimeMinutes = endHour * 60 + endMinute

                if (startTimeMinutes <= endTimeMinutes) {
                    if (currentTimeMinutes in startTimeMinutes until endTimeMinutes) {
                        return true
                    }
                } else {
                    if (currentTimeMinutes >= startTimeMinutes || currentTimeMinutes < endTimeMinutes) {
                        return true
                    }
                }
            }
        } catch (e: Exception) {}
        return false
    }

    /**
     * Increment the block attempt counter for a package.
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
        } catch (e: Exception) {}
    }

    override fun onInterrupt() {
        removeOverlay()
    }

    override fun onDestroy() {
        super.onDestroy()
        removeOverlay()
        handler.removeCallbacksAndMessages(null)
    }

    /**
     * Check if we should show a remaining-time banner for the current app.
     */
    private fun checkAndShowBanner(packageName: String) {
        try {
            val limitsPrefs = applicationContext.getSharedPreferences("focuslock_daily_limits", Context.MODE_PRIVATE)
            val limitsJson = limitsPrefs.getString("limits", "{}") ?: "{}"
            val limits = JSONObject(limitsJson)

            if (!limits.has(packageName)) {
                removeOverlay()
                return
            }

            val now = System.currentTimeMillis()
            if (now - lastBannerTime < BANNER_INTERVAL_MS) return

            val limitMinutes = limits.getInt(packageName)
            val limitMs = limitMinutes.toLong() * 60 * 1000

            val usagePrefs = applicationContext.getSharedPreferences("focuslock_usage_time", Context.MODE_PRIVATE)
            val dateFormat = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
            val today = dateFormat.format(Date())
            val usedMs = usagePrefs.getLong("usage_${today}_${packageName}", 0L)
            val remainingMs = limitMs - usedMs

            if (remainingMs > 0) {
                val remainingMin = (remainingMs / 60000).toInt()
                val appName = packageName.split(".").last().replaceFirstChar { it.uppercase() }
                val timeText = if (remainingMin >= 60) {
                    "${remainingMin / 60}h ${remainingMin % 60}m"
                } else {
                    "${remainingMin}m"
                }
                showBanner("\u23F1 $appName: $timeText remaining")
                lastBannerTime = now
            }
        } catch (e: Exception) {}
    }

    /**
     * Show a floating overlay banner at the top of the screen.
     */
    private fun showBanner(text: String) {
        handler.post {
            try {
                removeOverlay()

                val wm = getSystemService(WINDOW_SERVICE) as WindowManager

                val layout = LinearLayout(this).apply {
                    orientation = LinearLayout.HORIZONTAL
                    gravity = Gravity.CENTER
                    setBackgroundColor(Color.parseColor("#E0111128"))
                    setPadding(40, 20, 40, 20)
                }

                val tv = TextView(this).apply {
                    this.text = text
                    setTextColor(Color.parseColor("#F59E0B"))
                    setTextSize(TypedValue.COMPLEX_UNIT_SP, 14f)
                    typeface = Typeface.create("sans-serif-medium", Typeface.BOLD)
                    gravity = Gravity.CENTER
                }
                layout.addView(tv)

                val params = WindowManager.LayoutParams(
                    WindowManager.LayoutParams.MATCH_PARENT,
                    WindowManager.LayoutParams.WRAP_CONTENT,
                    WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY,
                    WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                        WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE or
                        WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
                    PixelFormat.TRANSLUCENT
                ).apply {
                    gravity = Gravity.TOP or Gravity.CENTER_HORIZONTAL
                    y = 80  // Below status bar
                }

                wm.addView(layout, params)
                overlayView = layout

                // Auto-dismiss after 4 seconds
                handler.postDelayed({ removeOverlay() }, 4000)
            } catch (e: Exception) {}
        }
    }

    /**
     * Remove the overlay banner if it exists.
     */
    private fun removeOverlay() {
        try {
            overlayView?.let {
                val wm = getSystemService(WINDOW_SERVICE) as WindowManager
                wm.removeView(it)
            }
        } catch (e: Exception) {}
        overlayView = null
    }
}
