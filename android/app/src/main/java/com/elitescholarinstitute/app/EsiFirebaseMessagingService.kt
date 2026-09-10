package com.elitescholarinstitute.app

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage

class EsiFirebaseMessagingService : FirebaseMessagingService() {

    companion object {
        private const val CHANNEL_ID = "esi_fcm_notifications"
        private const val BASE_NOTIFICATION_ID = 47000
        private const val DEFAULT_PATH = "/notification.html"
        private const val TOPIC = "esi_all"
    }

    override fun onNewToken(token: String) {
        super.onNewToken(token)
        // Android devices are addressed through the shared ESI topic.
        // No token is stored in the website or APK source code.
        com.google.firebase.messaging.FirebaseMessaging.getInstance().subscribeToTopic(TOPIC)
    }

    override fun onMessageReceived(message: RemoteMessage) {
        super.onMessageReceived(message)

        val data = message.data
        val title = data["title"]?.trim().orEmpty().ifBlank { "Elite Scholar Institute" }
        val body = data["body"]?.trim().orEmpty().ifBlank { "You have a new notification." }
        val path = data["path"]?.trim().orEmpty().ifBlank { DEFAULT_PATH }

        showNotification(title, body, path)
    }

    private fun showNotification(title: String, body: String, path: String) {
        if (Build.VERSION.SDK_INT >= 33 &&
            checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS) != android.content.pm.PackageManager.PERMISSION_GRANTED
        ) return

        createChannel()

        val tapIntent = Intent(this, MainActivity::class.java).apply {
            putExtra("esi_notification_path", path)
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }

        val requestCode = BASE_NOTIFICATION_ID + (System.currentTimeMillis() % 10000).toInt()
        val tapPendingIntent = PendingIntent.getActivity(
            this,
            requestCode,
            tapIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.logo)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setContentIntent(tapPendingIntent)
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .build()

        NotificationManagerCompat.from(this).notify(requestCode, notification)
    }

    private fun createChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "ESI Notifications",
                NotificationManager.IMPORTANCE_DEFAULT
            ).apply {
                description = "Elite Scholar Institute notifications"
            }
            getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
        }
    }
}
