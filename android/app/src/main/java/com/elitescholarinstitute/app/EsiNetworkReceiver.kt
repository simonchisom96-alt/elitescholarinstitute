package com.elitescholarinstitute.app

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.net.ConnectivityManager
import android.net.NetworkCapabilities

class EsiNetworkReceiver : BroadcastReceiver() {
    companion object {
        private const val REQUEST_CODE = 23122
        private const val CHECK_INTERVAL_MS = 15L * 60L * 1000L

        fun schedule(context: Context, delayMs: Long = CHECK_INTERVAL_MS) {
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            val intent = Intent(context, EsiNetworkReceiver::class.java).apply { action = "com.elitescholarinstitute.app.CHECK_NETWORK" }
            val pending = PendingIntent.getBroadcast(context, REQUEST_CODE, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
            alarmManager.cancel(pending)
            alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, System.currentTimeMillis() + delayMs, pending)
        }
    }

    override fun onReceive(context: Context, intent: Intent?) {
        if (intent?.action != ConnectivityManager.CONNECTIVITY_ACTION && intent?.action != "com.elitescholarinstitute.app.CHECK_NETWORK") return
        val manager = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        val network = manager.activeNetwork
        val capabilities = network?.let { manager.getNetworkCapabilities(it) }
        val connected = capabilities?.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) == true && capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED) == true
        val prefs = context.getSharedPreferences("esi_network", Context.MODE_PRIVATE)
        val initialized = prefs.getBoolean("initialized", false)
        val previous = prefs.getBoolean("connected", connected)
        if (initialized && previous != connected) EsiStatusNotification.show(context, connected)
        prefs.edit().putBoolean("initialized", true).putBoolean("connected", connected).apply()
        schedule(context)
    }
}
