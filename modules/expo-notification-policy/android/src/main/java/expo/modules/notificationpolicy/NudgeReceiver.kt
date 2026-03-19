package expo.modules.notificationpolicy

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.usage.UsageStatsManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import java.util.*

/**
 * BroadcastReceiver that fires on scheduled alarm intervals.
 * Reads current screen time from UsageStatsManager and sends a
 * "Reality Check" notification to create usage awareness.
 */
class NudgeReceiver : BroadcastReceiver() {

    companion object {
        const val CHANNEL_ID = "focuslock_nudge"
        const val NOTIFICATION_ID = 9001
    }

    override fun onReceive(context: Context, intent: Intent?) {
        val screenTimeMs = getTodayScreenTime(context)
        val message = buildNudgeMessage(screenTimeMs)

        createNotificationChannel(context)

        // Create intent to open the app
        val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)
        val pendingIntent = if (launchIntent != null) {
            PendingIntent.getActivity(
                context, 0, launchIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
        } else null

        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setContentTitle("⏰ Reality Check")
            .setContentText(message)
            .setStyle(NotificationCompat.BigTextStyle().bigText(message))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .build()

        val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        manager.notify(NOTIFICATION_ID, notification)
    }

    private fun getTodayScreenTime(context: Context): Long {
        return try {
            val usageStatsManager = context.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
            val calendar = Calendar.getInstance()
            val endTime = calendar.timeInMillis
            calendar.set(Calendar.HOUR_OF_DAY, 0)
            calendar.set(Calendar.MINUTE, 0)
            calendar.set(Calendar.SECOND, 0)
            calendar.set(Calendar.MILLISECOND, 0)
            val startTime = calendar.timeInMillis

            val stats = usageStatsManager.queryUsageStats(
                UsageStatsManager.INTERVAL_DAILY,
                startTime,
                endTime
            )

            var totalMs = 0L
            if (stats != null) {
                for (s in stats) {
                    totalMs += s.totalTimeInForeground
                }
            }
            totalMs
        } catch (e: Exception) {
            0L
        }
    }

    private fun buildNudgeMessage(screenTimeMs: Long): String {
        val hours = (screenTimeMs / (1000 * 60 * 60)).toInt()
        val minutes = ((screenTimeMs % (1000 * 60 * 60)) / (1000 * 60)).toInt()
        val timeStr = if (hours > 0) "${hours}h ${minutes}m" else "${minutes}m"

        val messages = listOf(
            "You've spent $timeStr on your phone today. Is this building your future?",
            "$timeStr of screen time today. Could some of that go towards your goals?",
            "Phone time today: $timeStr. Each minute is a choice — make it count.",
            "$timeStr on your phone. Your future self is watching. Make them proud.",
            "Reality check: $timeStr of screen time. Time to close some apps?",
            "$timeStr today. Remember: discipline = freedom. You got this 💪",
        )

        return messages.random()
    }

    private fun createNotificationChannel(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Reality Check Nudges",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Periodic reminders about your screen time"
            }
            val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            manager.createNotificationChannel(channel)
        }
    }
}
