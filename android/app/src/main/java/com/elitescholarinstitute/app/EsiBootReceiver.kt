package com.elitescholarinstitute.app

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class EsiBootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent?) {
        if (intent?.action == Intent.ACTION_BOOT_COMPLETED || intent?.action == Intent.ACTION_MY_PACKAGE_REPLACED) {
            NativeNotificationScheduler.initialize(context)
            EsiNetworkReceiver.schedule(context)
        }
    }
}
