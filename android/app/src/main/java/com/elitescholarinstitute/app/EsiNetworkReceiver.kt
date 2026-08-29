package com.elitescholarinstitute.app

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.net.ConnectivityManager

class EsiNetworkReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent?) {
        if (intent?.action != ConnectivityManager.CONNECTIVITY_ACTION) return
        val manager = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        val connected = manager.activeNetworkInfo?.isConnected == true
        val prefs = context.getSharedPreferences("esi_network", Context.MODE_PRIVATE)
        val previous = prefs.getBoolean("connected", connected)
        if (previous != connected) {
            prefs.edit().putBoolean("connected", connected).apply()
            EsiStatusNotification.show(context, connected)
        }
    }
}
