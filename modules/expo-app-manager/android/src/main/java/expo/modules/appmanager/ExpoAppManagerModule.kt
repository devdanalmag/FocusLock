package expo.modules.appmanager

import android.app.usage.UsageStats
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.app.AppOpsManager
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.drawable.BitmapDrawable
import android.graphics.drawable.Drawable
import android.os.Build
import android.os.Process
import android.provider.Settings
import android.util.Base64
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.Promise
import java.io.ByteArrayOutputStream
import java.text.SimpleDateFormat
import java.util.*

class ExpoAppManagerModule : Module() {
    override fun definition() = ModuleDefinition {
        Name("ExpoAppManager")

        AsyncFunction("getInstalledApps") { promise: Promise ->
            try {
                val context = appContext.reactContext ?: run {
                    promise.reject("ERR", "Context not available", null)
                    return@AsyncFunction
                }
                val pm = context.packageManager
                val apps = pm.getInstalledApplications(PackageManager.GET_META_DATA)
                val userApps = apps.filter { app ->
                    (app.flags and ApplicationInfo.FLAG_SYSTEM) == 0 &&
                    app.packageName != context.packageName
                }

                val result = userApps.map { app ->
                    val name = pm.getApplicationLabel(app).toString()
                    val packageName = app.packageName
                    val icon = try {
                        val drawable = pm.getApplicationIcon(app)
                        drawableToBase64(drawable)
                    } catch (e: Exception) {
                        null
                    }
                    mapOf(
                        "name" to name,
                        "packageName" to packageName,
                        "icon" to icon
                    )
                }.sortedBy { it["name"] as? String }

                promise.resolve(result)
            } catch (e: Exception) {
                promise.reject("ERR", "Failed to get installed apps: ${e.message}", e)
            }
        }

        AsyncFunction("getAppUsageStats") { daysBack: Int, promise: Promise ->
            try {
                val context = appContext.reactContext ?: run {
                    promise.reject("ERR", "Context not available", null)
                    return@AsyncFunction
                }
                val usageStatsManager = context.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
                val pm = context.packageManager

                val calendar = Calendar.getInstance()
                val endTime = calendar.timeInMillis
                calendar.add(Calendar.DAY_OF_YEAR, -daysBack)
                val startTime = calendar.timeInMillis

                val usageStatsList = usageStatsManager.queryUsageStats(
                    UsageStatsManager.INTERVAL_DAILY,
                    startTime,
                    endTime
                )

                if (usageStatsList == null || usageStatsList.isEmpty()) {
                    promise.resolve(emptyList<Map<String, Any?>>())
                    return@AsyncFunction
                }

                val dateFormat = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())

                // Group by package and aggregate
                val appUsageMap = mutableMapOf<String, MutableMap<String, Any?>>()

                for (stats in usageStatsList) {
                    if (stats.totalTimeInForeground <= 0) continue
                    val pkg = stats.packageName

                    // Skip system packages and our own app
                    if (pkg == context.packageName) continue

                    val existing = appUsageMap[pkg]
                    if (existing != null) {
                        val prevTime = (existing["totalTimeMs"] as? Long) ?: 0L
                        existing["totalTimeMs"] = prevTime + stats.totalTimeInForeground
                        val prevLast = (existing["lastUsed"] as? Long) ?: 0L
                        if (stats.lastTimeUsed > prevLast) {
                            existing["lastUsed"] = stats.lastTimeUsed
                        }
                    } else {
                        val appName = try {
                            val appInfo = pm.getApplicationInfo(pkg, 0)
                            pm.getApplicationLabel(appInfo).toString()
                        } catch (e: Exception) {
                            pkg
                        }
                        appUsageMap[pkg] = mutableMapOf(
                            "packageName" to pkg,
                            "appName" to appName,
                            "totalTimeMs" to stats.totalTimeInForeground,
                            "lastUsed" to stats.lastTimeUsed
                        )
                    }
                }

                // Sort by total time descending
                val result = appUsageMap.values
                    .sortedByDescending { (it["totalTimeMs"] as? Long) ?: 0L }
                    .take(20)  // Top 20 apps
                    .toList()

                promise.resolve(result)
            } catch (e: Exception) {
                promise.reject("ERR", "Failed to get usage stats: ${e.message}", e)
            }
        }

        AsyncFunction("getDailyUsageTotals") { daysBack: Int, promise: Promise ->
            try {
                val context = appContext.reactContext ?: run {
                    promise.reject("ERR", "Context not available", null)
                    return@AsyncFunction
                }
                val usageStatsManager = context.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
                val dateFormat = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())

                val result = mutableListOf<Map<String, Any>>()

                for (day in 0 until daysBack) {
                    val cal = Calendar.getInstance()
                    cal.add(Calendar.DAY_OF_YEAR, -day)
                    cal.set(Calendar.HOUR_OF_DAY, 0)
                    cal.set(Calendar.MINUTE, 0)
                    cal.set(Calendar.SECOND, 0)
                    cal.set(Calendar.MILLISECOND, 0)
                    val dayStart = cal.timeInMillis

                    cal.add(Calendar.DAY_OF_YEAR, 1)
                    val dayEnd = cal.timeInMillis

                    val stats = usageStatsManager.queryUsageStats(
                        UsageStatsManager.INTERVAL_DAILY,
                        dayStart,
                        dayEnd
                    )

                    var totalMs = 0L
                    if (stats != null) {
                        for (s in stats) {
                            totalMs += s.totalTimeInForeground
                        }
                    }

                    val dateStr = dateFormat.format(Date(dayStart))
                    result.add(mapOf(
                        "date" to dateStr,
                        "totalTimeMs" to totalMs
                    ))
                }

                promise.resolve(result.reversed()) // Oldest first
            } catch (e: Exception) {
                promise.reject("ERR", "Failed to get daily totals: ${e.message}", e)
            }
        }

        AsyncFunction("hasUsageStatsPermission") { promise: Promise ->
            try {
                val context = appContext.reactContext ?: run {
                    promise.resolve(false)
                    return@AsyncFunction
                }
                val appOps = context.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
                val mode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    appOps.unsafeCheckOpNoThrow(
                        AppOpsManager.OPSTR_GET_USAGE_STATS,
                        Process.myUid(),
                        context.packageName
                    )
                } else {
                    @Suppress("DEPRECATION")
                    appOps.checkOpNoThrow(
                        AppOpsManager.OPSTR_GET_USAGE_STATS,
                        Process.myUid(),
                        context.packageName
                    )
                }
                promise.resolve(mode == AppOpsManager.MODE_ALLOWED)
            } catch (e: Exception) {
                promise.resolve(false)
            }
        }

        AsyncFunction("openUsageStatsSettings") { promise: Promise ->
            try {
                val context = appContext.reactContext ?: run {
                    promise.reject("ERR", "Context not available", null)
                    return@AsyncFunction
                }
                val intent = Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS)
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                context.startActivity(intent)
                promise.resolve(true)
            } catch (e: Exception) {
                promise.reject("ERR", "Failed to open settings: ${e.message}", e)
            }
        }
    }

    private fun drawableToBase64(drawable: Drawable): String? {
        return try {
            val bitmap = if (drawable is BitmapDrawable) {
                drawable.bitmap
            } else {
                val width = drawable.intrinsicWidth.coerceAtLeast(1)
                val height = drawable.intrinsicHeight.coerceAtLeast(1)
                val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
                val canvas = Canvas(bitmap)
                drawable.setBounds(0, 0, canvas.width, canvas.height)
                drawable.draw(canvas)
                bitmap
            }
            val scaledBitmap = Bitmap.createScaledBitmap(bitmap, 96, 96, true)
            val stream = ByteArrayOutputStream()
            scaledBitmap.compress(Bitmap.CompressFormat.PNG, 80, stream)
            val bytes = stream.toByteArray()
            "data:image/png;base64," + Base64.encodeToString(bytes, Base64.NO_WRAP)
        } catch (e: Exception) {
            null
        }
    }
}
