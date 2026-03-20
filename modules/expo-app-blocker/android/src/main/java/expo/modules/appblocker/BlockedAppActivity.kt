package expo.modules.appblocker

import android.app.Activity
import android.content.Context
import android.content.SharedPreferences
import android.graphics.Color
import android.graphics.Typeface
import android.os.Bundle
import android.os.CountDownTimer
import android.util.TypedValue
import android.view.Gravity
import android.view.View
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.*

/**
 * Full-screen activity shown when a blocked/paused app is opened.
 * Shows "App is Paused" with a 10-second countdown before allowing navigation away.
 * Displays today's attempt count for psychological deterrent.
 */
class BlockedAppActivity : Activity() {

    private var countDownTimer: CountDownTimer? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val blockedPackage = intent.getStringExtra("blocked_package") ?: ""
        val blockReason = intent.getStringExtra("block_reason") ?: "paused"

        // Get paused app info from shared prefs
        val prefs = getSharedPreferences("focuslock_data", Context.MODE_PRIVATE)
        val pausedAppsJson = prefs.getString("paused_apps", "[]") ?: "[]"
        
        var appName = blockedPackage
        var daysRemaining = "?"

        try {
            val arr = org.json.JSONArray(pausedAppsJson)
            for (i in 0 until arr.length()) {
                val obj = arr.getJSONObject(i)
                if (obj.getString("packageName") == blockedPackage) {
                    appName = obj.optString("name", blockedPackage)
                    val unlockTime = obj.optLong("unlockTime", 0)
                    if (unlockTime > 0) {
                        val remaining = unlockTime - System.currentTimeMillis()
                        val days = (remaining / (1000 * 60 * 60 * 24)).toInt()
                        val hours = ((remaining / (1000 * 60 * 60)) % 24).toInt()
                        daysRemaining = if (days > 0) "${days}d ${hours}h" else "${hours}h"
                    }
                    break
                }
            }
        } catch (e: Exception) {
            // Use fallback values
        }

        // Get today's attempt count
        val attemptsPrefs = getSharedPreferences("focuslock_attempts", Context.MODE_PRIVATE)
        val dateFormat = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
        val today = dateFormat.format(Date())
        val attemptKey = "attempts_${today}_${blockedPackage}"
        val todayAttempts = attemptsPrefs.getInt(attemptKey, 0)

        // Choose title/icon based on reason
        val titleText = when (blockReason) {
            "time_limit" -> "Daily Limit Reached"
            "scheduled" -> "Schedule Active"
            else -> "App Paused"
        }
        val iconText = when (blockReason) {
            "time_limit" -> "⏰"
            "scheduled" -> "📅"
            else -> "🔒"
        }

        // Build UI programmatically
        val layout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setBackgroundColor(Color.parseColor("#0a0a1a"))
            setPadding(60, 100, 60, 100)
        }

        // Lock icon
        val lockIcon = TextView(this).apply {
            text = iconText
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 72f)
            gravity = Gravity.CENTER
            setPadding(0, 0, 0, 40)
        }
        layout.addView(lockIcon)

        // Title
        val title = TextView(this).apply {
            text = titleText
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 32f)
            setTextColor(Color.WHITE)
            typeface = Typeface.create("sans-serif-medium", Typeface.BOLD)
            gravity = Gravity.CENTER
            setPadding(0, 0, 0, 20)
        }
        layout.addView(title)

        // App name
        val appNameView = TextView(this).apply {
            text = appName
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 18f)
            setTextColor(Color.parseColor("#8b5cf6"))
            typeface = Typeface.create("sans-serif-medium", Typeface.NORMAL)
            gravity = Gravity.CENTER
            setPadding(0, 0, 0, 20)
        }
        layout.addView(appNameView)

        // Subtitle
        val subtitle = TextView(this).apply {
            text = "This app is locked to help you stay focused.\nTime remaining: $daysRemaining"
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 16f)
            setTextColor(Color.parseColor("#94a3b8"))
            gravity = Gravity.CENTER
            lineHeight = 60
            setPadding(0, 0, 0, 24)
        }
        layout.addView(subtitle)

        // Attempt counter (psychological deterrent)
        if (todayAttempts > 0) {
            val attemptText = TextView(this).apply {
                text = "You've tried to open this app $todayAttempts time${if (todayAttempts > 1) "s" else ""} today"
                setTextSize(TypedValue.COMPLEX_UNIT_SP, 14f)
                setTextColor(Color.parseColor("#f87171"))
                gravity = Gravity.CENTER
                typeface = Typeface.create("sans-serif-medium", Typeface.BOLD)
                setPadding(0, 0, 0, 24)
            }
            layout.addView(attemptText)
        }

        // Countdown text
        val countdownText = TextView(this).apply {
            text = "Wait 10 seconds…\nDo you really need this app?"
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 16f)
            setTextColor(Color.parseColor("#f59e0b"))
            gravity = Gravity.CENTER
            typeface = Typeface.create("sans-serif-medium", Typeface.BOLD)
            setPadding(0, 0, 0, 16)
        }
        layout.addView(countdownText)

        // Progress bar for countdown
        val progressBar = ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal).apply {
            max = 100
            progress = 0
            val params = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                dpToPx(8)
            )
            params.setMargins(40, 0, 40, 32)
            layoutParams = params
            progressDrawable.setColorFilter(
                Color.parseColor("#8b5cf6"),
                android.graphics.PorterDuff.Mode.SRC_IN
            )
        }
        layout.addView(progressBar)

        // Motivational quote
        val quotes = listOf(
            "\"Focus is the art of knowing what to ignore.\"",
            "\"Discipline is choosing what you want most\nover what you want now.\"",
            "\"Your future self will thank you.\"",
            "\"Small daily improvements lead to\nstunning results.\"",
            "\"The secret of getting ahead is getting started.\""
        )
        val quote = TextView(this).apply {
            text = quotes.random()
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 14f)
            setTextColor(Color.parseColor("#64748b"))
            gravity = Gravity.CENTER
            setTypeface(typeface, Typeface.ITALIC)
            setPadding(40, 0, 40, 60)
        }
        layout.addView(quote)

        // Go Back button (initially disabled)
        val button = Button(this).apply {
            text = "⏳ Wait 10s…"
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 16f)
            setTextColor(Color.parseColor("#64748b"))
            setBackgroundColor(Color.parseColor("#111127"))
            setPadding(80, 30, 80, 30)
            isEnabled = false
            alpha = 0.5f
            setOnClickListener {
                goHome()
            }
        }
        layout.addView(button)

        setContentView(layout)

        // Start 10-second countdown
        countDownTimer = object : CountDownTimer(10000, 100) {
            override fun onTick(millisUntilFinished: Long) {
                val secondsLeft = (millisUntilFinished / 1000).toInt() + 1
                val progress = ((10000 - millisUntilFinished).toFloat() / 10000f * 100f).toInt()
                progressBar.progress = progress
                countdownText.text = "Wait $secondsLeft second${if (secondsLeft > 1) "s" else ""}…\nDo you really need this app?"
                button.text = "⏳ Wait ${secondsLeft}s…"
            }

            override fun onFinish() {
                progressBar.progress = 100
                countdownText.text = "Time's up — you can leave now"
                countdownText.setTextColor(Color.parseColor("#4ade80"))
                button.apply {
                    text = "← Go Back"
                    setTextColor(Color.WHITE)
                    setBackgroundColor(Color.parseColor("#1e1e3a"))
                    isEnabled = true
                    alpha = 1.0f
                }
            }
        }.start()
    }

    private fun goHome() {
        finish()
        val homeIntent = android.content.Intent(android.content.Intent.ACTION_MAIN).apply {
            addCategory(android.content.Intent.CATEGORY_HOME)
            addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        startActivity(homeIntent)
    }

    private fun dpToPx(dp: Int): Int {
        return TypedValue.applyDimension(
            TypedValue.COMPLEX_UNIT_DIP,
            dp.toFloat(),
            resources.displayMetrics
        ).toInt()
    }

    override fun onBackPressed() {
        super.onBackPressed()
        goHome()
    }

    override fun onDestroy() {
        super.onDestroy()
        countDownTimer?.cancel()
    }
}
