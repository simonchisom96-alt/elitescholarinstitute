package com.elitescholarinstitute.app

import android.app.Application
import com.pusher.pushnotifications.PushNotifications

class EsiApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        try {
            PushNotifications.start(this, "194482e6-d06b-4102-bd18-c8c32ca77565")
            PushNotifications.addDeviceInterest("esi-announcements")
        } catch (_: Exception) {
            // Keep normal ESI startup intact if Beams is temporarily unavailable.
        }
    }
}
