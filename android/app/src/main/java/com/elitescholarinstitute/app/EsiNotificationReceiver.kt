package com.elitescholarinstitute.app

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class EsiNotificationReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent?) {
        NativeNotificationScheduler.showNext(context)
    }
}
