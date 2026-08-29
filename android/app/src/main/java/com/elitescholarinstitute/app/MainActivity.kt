package com.elitescholarinstitute.app

import android.Manifest
import android.annotation.SuppressLint
import android.content.Intent
import android.content.pm.PackageManager
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.os.Build
import android.os.Bundle
import android.view.ViewGroup
import android.webkit.CookieManager
import android.webkit.MimeTypeMap
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.activity.enableEdgeToEdge
import java.io.ByteArrayInputStream
import java.io.File
import java.io.FileNotFoundException
import java.io.FileOutputStream
import java.net.HttpURLConnection
import java.net.URL
import java.security.MessageDigest

class MainActivity : ComponentActivity() {
    private lateinit var webView: WebView
    private val offlineHome = "https://appassets.androidplatform.net/index.html"
    private val onlineOrigin = "https://elitescholarinstitute.pages.dev"
    private val diskCache by lazy { File(cacheDir, "esi-web-cache").apply { mkdirs() } }
    private var networkCallback: ConnectivityManager.NetworkCallback? = null
    private var lastNetworkState: Boolean? = null

    private companion object {
        const val NOTIFICATION_PERMISSION_REQUEST = 1001
        const val PERMISSION_PREFS = "esi_notification_permission"
        const val ASKED = "asked"
        const val DENIED_AT = "denied_at"
        const val RETRY_AFTER_MS = 50L * 60L * 60L * 1000L
    }

    private fun mimeType(path: String): String {
        val ext = path.substringAfterLast('.', "").lowercase()
        return when (ext) {
            "html", "htm" -> "text/html"
            "js", "mjs" -> "application/javascript"
            "css" -> "text/css"
            "json", "map" -> "application/json"
            "pdf" -> "application/pdf"
            "jpg", "jpeg" -> "image/jpeg"
            "png" -> "image/png"
            "gif" -> "image/gif"
            "webp" -> "image/webp"
            "svg" -> "image/svg+xml"
            "mp4" -> "video/mp4"
            "webm" -> "video/webm"
            "mp3" -> "audio/mpeg"
            "wav" -> "audio/wav"
            "woff" -> "font/woff"
            "woff2" -> "font/woff2"
            "ttf" -> "font/ttf"
            "ico" -> "image/x-icon"
            else -> MimeTypeMap.getSingleton().getMimeTypeFromExtension(ext) ?: "application/octet-stream"
        }
    }

    private fun cacheKey(pathAndQuery: String): String {
        val digest = MessageDigest.getInstance("SHA-256").digest(pathAndQuery.toByteArray())
        return digest.joinToString("") { "%02x".format(it) }
    }

    private fun bundledAsset(path: String): WebResourceResponse? {
        return try {
            WebResourceResponse(mimeType(path), "UTF-8", assets.open("site/$path"))
        } catch (_: FileNotFoundException) {
            null
        } catch (_: Exception) {
            null
        }
    }

    private fun cachedAsset(pathAndQuery: String, path: String): WebResourceResponse? {
        val file = File(diskCache, cacheKey(pathAndQuery))
        if (!file.isFile || file.length() == 0L) return null
        return try {
            WebResourceResponse(mimeType(path), "UTF-8", file.inputStream())
        } catch (_: Exception) {
            null
        }
    }

    private fun networkAsset(pathAndQuery: String, path: String): WebResourceResponse? {
        var connection: HttpURLConnection? = null
        return try {
            val activeConnection = (URL(onlineOrigin + pathAndQuery).openConnection() as HttpURLConnection).apply {
                requestMethod = "GET"
                connectTimeout = 9000
                readTimeout = 15000
                useCaches = true
                instanceFollowRedirects = true
            }
            connection = activeConnection
            if (activeConnection.responseCode !in 200..299) return null
            val bytes = activeConnection.inputStream.use { it.readBytes() }
            if (bytes.isEmpty()) return null
            FileOutputStream(File(diskCache, cacheKey(pathAndQuery))).use { it.write(bytes) }
            WebResourceResponse(mimeType(path), "UTF-8", ByteArrayInputStream(bytes))
        } catch (_: Exception) {
            null
        } finally {
            connection?.disconnect()
        }
    }

    private fun localOrCachedAsset(request: WebResourceRequest): WebResourceResponse? {
        val uri = request.url
        if (uri.host != "appassets.androidplatform.net") return null
        val path = uri.path?.removePrefix("/") ?: return null
        if (path.isEmpty()) return null
        bundledAsset(path)?.let { return it }
        val pathAndQuery = if (uri.query.isNullOrEmpty()) "/$path" else "/$path?${uri.query}"
        cachedAsset(pathAndQuery, path)?.let { return it }
        return networkAsset(pathAndQuery, path)
    }

    private fun handleNotificationIntent(intent: Intent?) {
        val path = intent?.getStringExtra("esi_notification_path") ?: return
        if (!path.startsWith("/") || path.contains("..")) return
        webView.post { webView.loadUrl("https://appassets.androidplatform.net$path") }
        intent.removeExtra("esi_notification_path")
    }

    private fun currentNetworkState(): Boolean {
        val manager = getSystemService(ConnectivityManager::class.java)
        val network = manager.activeNetwork ?: return false
        val capabilities = manager.getNetworkCapabilities(network) ?: return false
        return capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) &&
            capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)
    }

    private fun emitNetworkState(connected: Boolean, notify: Boolean) {
        val previous = lastNetworkState
        lastNetworkState = connected
        if (notify && previous != null && previous != connected) {
            EsiStatusNotification.show(this, connected)
        }
    }

    private fun monitorNetwork() {
        val manager = getSystemService(ConnectivityManager::class.java)
        emitNetworkState(currentNetworkState(), false)
        val callback = object : ConnectivityManager.NetworkCallback() {
            override fun onAvailable(network: Network) {
                runOnUiThread { emitNetworkState(true, true) }
            }
            override fun onLost(network: Network) {
                runOnUiThread { emitNetworkState(currentNetworkState(), true) }
            }
        }
        networkCallback = callback
        try { manager.registerDefaultNetworkCallback(callback) } catch (_: Exception) { }
        EsiNetworkReceiver.schedule(this)
    }

    private fun injectAppJs() {
        try {
            val source = assets.open("site/app.js").bufferedReader().use { it.readText() }
            webView.evaluateJavascript("javascript:(function(){if(window.__esiAppJsInjected)return;window.__esiAppJsInjected=true;$source})()", null)
        } catch (_: Exception) { }
    }

    private fun requestNotificationPermissionIfDue() {
        if (Build.VERSION.SDK_INT < 33) {
            NativeNotificationScheduler.initialize(this)
            return
        }
        if (checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED) {
            NativeNotificationScheduler.initialize(this)
            return
        }

        val prefs = getSharedPreferences(PERMISSION_PREFS, MODE_PRIVATE)
        val asked = prefs.getBoolean(ASKED, false)
        val deniedAt = prefs.getLong(DENIED_AT, 0L)

        if (!asked) {
            prefs.edit().putBoolean(ASKED, true).apply()
            requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), NOTIFICATION_PERMISSION_REQUEST)
            return
        }

        val retryDue = deniedAt > 0L && System.currentTimeMillis() - deniedAt >= RETRY_AFTER_MS
        if (retryDue && shouldShowRequestPermissionRationale(Manifest.permission.POST_NOTIFICATIONS)) {
            prefs.edit().putLong(DENIED_AT, System.currentTimeMillis()).apply()
            requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), NOTIFICATION_PERMISSION_REQUEST)
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        webView = WebView(this)
        webView.layoutParams = ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT)
        setContentView(webView)
        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            allowFileAccess = false
            allowContentAccess = false
            javaScriptCanOpenWindowsAutomatically = false
            setSupportMultipleWindows(false)
            cacheMode = WebSettings.LOAD_DEFAULT
            mediaPlaybackRequiresUserGesture = true
            builtInZoomControls = false
            displayZoomControls = false
            userAgentString = "$userAgentString ESIAndroid/1.0"
        }
        CookieManager.getInstance().setAcceptCookie(true)
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true)
        webView.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse? =
                localOrCachedAsset(request) ?: super.shouldInterceptRequest(view, request)
            override fun onPageFinished(view: WebView, url: String?) {
                super.onPageFinished(view, url)
                injectAppJs()
            }
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                val uri = request.url
                if (uri.scheme == "http" || uri.scheme == "https") return false
                return try { startActivity(Intent(Intent.ACTION_VIEW, uri)); true } catch (_: Exception) { true }
            }
        }
        if (savedInstanceState == null) webView.loadUrl(offlineHome) else webView.restoreState(savedInstanceState)
        handleNotificationIntent(intent)
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() { if (webView.canGoBack()) webView.goBack() else finish() }
        })
        requestNotificationPermissionIfDue()
        monitorNetwork()
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode != NOTIFICATION_PERMISSION_REQUEST) return
        val granted = grantResults.firstOrNull() == PackageManager.PERMISSION_GRANTED
        val prefs = getSharedPreferences(PERMISSION_PREFS, MODE_PRIVATE)
        if (granted) {
            prefs.edit().remove(DENIED_AT).apply()
            NativeNotificationScheduler.initialize(this)
        } else {
            prefs.edit().putLong(DENIED_AT, System.currentTimeMillis()).apply()
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        handleNotificationIntent(intent)
    }

    override fun onSaveInstanceState(outState: Bundle) {
        webView.saveState(outState)
        super.onSaveInstanceState(outState)
    }

    override fun onDestroy() {
        networkCallback?.let { callback ->
            try { getSystemService(ConnectivityManager::class.java).unregisterNetworkCallback(callback) } catch (_: Exception) { }
        }
        webView.stopLoading()
        webView.webChromeClient = null
        (webView.parent as? ViewGroup)?.removeView(webView)
        webView.destroy()
        super.onDestroy()
    }
}
