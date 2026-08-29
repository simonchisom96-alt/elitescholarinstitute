package com.elitescholarinstitute.app

import android.Manifest
import android.app.AlarmManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat

object NativeNotificationScheduler {
    private const val CHANNEL_ID = "esi_study_notifications"
    private const val PREFS = "esi_native_notifications"
    private const val INDEX = "next_index"
    private const val REQUEST_CODE = 23120
    private const val INTERVAL_MS = 6L * 60L * 60L * 1000L

    private val messages = arrayOf(
        "Dear Scholar, Your future is built today through persistent reading 🔥|You have come too far to stop now, so open your textbooks right now and continue the rewarding journey of academic excellence.|/Textbooks.html",
        "Rise high in the leader's board right now! 📊|Train yourself intensely with others to rise above all competitors in the leader's board.|/quiz.html",
        "You have a brand new urgent notification waiting 🗨️|View our elite announcement channel for daily updates, quiz drills, live classes, and more.|/notification.html",
        "A smarter and faster way to prepare properly 📚|Learn how elite top scorers prepare differently for exams. Your post UTME success guide is ready.|/postutme.html",
        "Stay strictly on the right track every single day 📃|Your detailed syllabus guide is waiting to lead you through your examination preparation.|/syllables.html",
        "Small daily wins matter for your exams 🧠|Answer challenging questions today and build confidence for tomorrow's challenges.|/quiz.html",
        "Keep pushing forward no matter how hard it gets ⚡|Slow steady progress is still massive progress every day. Your motivational guide is ready.|/motivatio.html",
        "See it clearly so you can remember it forever 🖼️|Open educational pictures to understand difficult concepts through visual learning.|/picture.html",
        "One more powerful step toward your dreams 📖|Continue your deep reading today and conquer every textbook chapter.|/Textbooks.html",
        "Prove your incredible worth to yourself today 🧠|Start practicing with a challenging quiz and grow your knowledge.|/quiz.html",
        "You have a brand new urgent notification waiting 🗨️|View the elite notification channel for updates and study activities.|/notification.html",
        "You are much closer than you think to success 📃|Open your ultimate exam guide and keep working toward your next level.|/postutme.html",
        "Want to know all about elite scholar institute? 📚|View the history and founders who contributed to Elite Scholar Institute.|/credit.html",
        "Do not ever give up on your goals yet 🔥|This difficult moment in your studies is shaping your success story. Keep going.|/motivatio.html",
        "Small daily wins matter for your exams 📊|Start your daily interactive quiz session and keep building your preparation.|/quiz.html",
        "Learn much faster with vibrant visual aids 🌠|Tap to view diagrams and understand core concepts clearly.|/picture.html",
        "Stay strictly on the right track every single day 🎯|Use your detailed syllabus guide to organize your academic preparation.|/syllables.html",
        "Discipline beats raw motivation every single time 📚|Show up to study today and master your core subjects.|/Textbooks.html",
        "Prepare like a true champion and winner 📜|Smart winners prepare long before opportunity arrives. Use your post UTME preparation pack.|/postutme.html",
        "Your study plan needs clear direction 🎯|Get proper academic direction and organize your study schedule.|/syllables.html"
    )

    fun initialize(context: Context) {
        createChannel(context)
        scheduleNext(context, 60_000L)
    }

    fun showNext(context: Context) {
        if (Build.VERSION.SDK_INT >= 33 && context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            scheduleNext(context, INTERVAL_MS)
            return
        }
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val index = prefs.getInt(INDEX, 0).coerceIn(0, messages.lastIndex)
        val parts = messages[index].split('|', limit = 3)
        val tapIntent = Intent(context, MainActivity::class.java).apply {
            putExtra("esi_notification_path", parts[2])
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val tapPending = PendingIntent.getActivity(context, REQUEST_CODE + index, tapIntent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.drawable.logo)
            .setContentTitle(parts[0])
            .setContentText(parts[1])
            .setStyle(NotificationCompat.BigTextStyle().bigText(parts[1]))
            .setContentIntent(tapPending)
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .build()
        NotificationManagerCompat.from(context).notify(REQUEST_CODE, notification)
        prefs.edit().putInt(INDEX, (index + 1) % messages.size).apply()
        scheduleNext(context, INTERVAL_MS)
    }

    fun scheduleNext(context: Context, delayMs: Long = INTERVAL_MS) {
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val intent = Intent(context, EsiNotificationReceiver::class.java)
        val pending = PendingIntent.getBroadcast(context, REQUEST_CODE, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        alarmManager.cancel(pending)
        alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, System.currentTimeMillis() + delayMs, pending)
    }

    private fun createChannel(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(CHANNEL_ID, "ESI Study Notifications", NotificationManager.IMPORTANCE_DEFAULT).apply {
                description = "Elite Scholar Institute study reminders"
            }
            context.getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
        }
    }
}
