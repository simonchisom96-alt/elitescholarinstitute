package com.elitescholarinstitute.app

import android.Manifest
import android.app.Activity
import android.app.Application
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.view.View
import android.view.ViewGroup
import android.webkit.WebView
import androidx.activity.ComponentActivity
import androidx.core.content.ContextCompat
import com.google.firebase.messaging.FirebaseMessaging

class EsiNotificationApplication : Application() {

    companion object {
        private const val NOTIFICATION_PATH_EXTRA = "esi_notification_path"
        private const val NOTIFICATION_URL_PREFIX = "https://appassets.androidplatform.net/"
        private const val NOTIFICATION_PERMISSION_REQUEST = 47001
    }

    override fun onCreate() {
        super.onCreate()
        FirebaseMessaging.getInstance().subscribeToTopic("esi_all")

        registerActivityLifecycleCallbacks(object : ActivityLifecycleCallbacks {
            override fun onActivityCreated(activity: Activity, savedInstanceState: android.os.Bundle?) {
                if (activity !is MainActivity) return

                requestNotificationPermission(activity)

                if (activity is ComponentActivity) {
                    activity.addOnNewIntentListener { intent ->
                        openNotificationPage(activity, intent)
                    }
                }

                openNotificationPage(activity, activity.intent)
            }

            override fun onActivityStarted(activity: Activity) = Unit
            override fun onActivityResumed(activity: Activity) = Unit
            override fun onActivityPaused(activity: Activity) = Unit
            override fun onActivityStopped(activity: Activity) = Unit
            override fun onActivitySaveInstanceState(activity: Activity, outState: android.os.Bundle) = Unit
            override fun onActivityDestroyed(activity: Activity) = Unit
        })
    }

    private fun requestNotificationPermission(activity: Activity) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return
        if (ContextCompat.checkSelfPermission(activity, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED) return
        activity.requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), NOTIFICATION_PERMISSION_REQUEST)
    }

    private fun openNotificationPage(activity: Activity, intent: Intent?) {
        val rawPath = intent?.getStringExtra(NOTIFICATION_PATH_EXTRA)?.trim().orEmpty()
        if (rawPath.isBlank()) return

        val path = if (rawPath.startsWith("/")) rawPath else "/$rawPath"
        if (!path.equals("/notification.html", ignoreCase = true)) return

        val webView = findWebView(activity.window.decorView) ?: return
        webView.post {
            if (!activity.isFinishing && !activity.isDestroyed) {
                webView.loadUrl(NOTIFICATION_URL_PREFIX + "notification.html")
            }
        }
    }

    private fun findWebView(view: View): WebView? {
        if (view is WebView) return view
        if (view !is ViewGroup) return null
        for (index in 0 until view.childCount) {
            findWebView(view.getChildAt(index))?.let { return it }
        }
        return null
    }
}
