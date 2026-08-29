package com.elitescholarinstitute.app

import android.annotation.SuppressLint
import android.app.AlertDialog
import android.content.Intent
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.os.Bundle
import android.util.Base64
import android.view.ViewGroup
import android.webkit.CookieManager
import android.webkit.JavascriptInterface
import android.webkit.JsResult
import android.webkit.MimeTypeMap
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.activity.enableEdgeToEdge
import androidx.core.content.FileProvider
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
    private val shareDir by lazy { File(cacheDir, "shared").apply { mkdirs() } }

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

    private fun currentNetworkState(): Boolean {
        val manager = getSystemService(ConnectivityManager::class.java)
        val network = manager.activeNetwork ?: return false
        val capabilities = manager.getNetworkCapabilities(network) ?: return false
        return capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) &&
            capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)
    }

    private fun injectAppJs() {
        webView.evaluateJavascript(buildAndroidBridgeJs(), null)
    }

    private fun buildAndroidBridgeJs(): String = """
        (function(){
          if(!window.ESIAndroid || window.__esiAndroidBridgeInstalled) return;
          window.__esiAndroidBridgeInstalled = true;
          navigator.share = function(data){
            data = data || {};
            if(data.files && data.files.length){
              const file = data.files[0];
              return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = function(){
                  try {
                    const result = String(reader.result || '');
                    const comma = result.indexOf(',');
                    const base64 = comma >= 0 ? result.slice(comma + 1) : result;
                    window.ESIAndroid.shareFile(file.name || 'shared_file', file.type || 'application/octet-stream', base64, data.title || '', data.text || '');
                    resolve();
                  } catch(e){ reject(e); }
                };
                reader.onerror = () => reject(reader.error || new Error('Unable to read file'));
                reader.readAsDataURL(file);
              });
            }
            window.ESIAndroid.share(data.title || 'Elite Scholar Institute', data.text || '', data.url || '');
            return Promise.resolve();
          };
        })();
    """.trimIndent()

    private inner class AndroidBridge {
        @JavascriptInterface
        fun share(title: String, text: String, url: String) {
            runOnUiThread {
                val safeUrl = if (url.startsWith("https://appassets.androidplatform.net/")) {
                    onlineOrigin + url.removePrefix("https://appassets.androidplatform.net")
                } else {
                    url
                }
                val body = if (safeUrl.isBlank()) text else if (text.isBlank()) safeUrl else "$text\n$safeUrl"
                val intent = Intent(Intent.ACTION_SEND).apply {
                    type = "text/plain"
                    putExtra(Intent.EXTRA_SUBJECT, title)
                    putExtra(Intent.EXTRA_TEXT, body)
                }
                startActivity(Intent.createChooser(intent, "Share with"))
            }
        }

        @JavascriptInterface
        fun shareFile(name: String, mime: String, base64: String, title: String, text: String) {
            runOnUiThread {
                try {
                    val safeName = name.substringAfterLast('/').ifBlank { "shared_file" }
                    val file = File(shareDir, safeName)
                    file.writeBytes(Base64.decode(base64, Base64.DEFAULT))
                    val uri = FileProvider.getUriForFile(this@MainActivity, "$packageName.fileprovider", file)
                    val intent = Intent(Intent.ACTION_SEND).apply {
                        type = mime.ifBlank { "application/octet-stream" }
                        putExtra(Intent.EXTRA_STREAM, uri)
                        if (text.isNotBlank()) putExtra(Intent.EXTRA_TEXT, text)
                        if (title.isNotBlank()) putExtra(Intent.EXTRA_SUBJECT, title)
                        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                    }
                    startActivity(Intent.createChooser(intent, "Share with"))
                } catch (_: Exception) {
                    android.widget.Toast.makeText(this@MainActivity, "Unable to share file", android.widget.Toast.LENGTH_SHORT).show()
                }
            }
        }

        @JavascriptInterface
        fun openPdf(name: String, base64: String) {
            runOnUiThread {
                try {
                    val safeName = name.substringAfterLast('/').ifBlank { "document.pdf" }
                    val finalName = if (safeName.lowercase().endsWith(".pdf")) safeName else "$safeName.pdf"
                    val file = File(shareDir, finalName)
                    file.writeBytes(Base64.decode(base64, Base64.DEFAULT))
                    val uri = FileProvider.getUriForFile(this@MainActivity, "$packageName.fileprovider", file)
                    val intent = Intent(Intent.ACTION_VIEW).apply {
                        setDataAndType(uri, "application/pdf")
                        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                    }
                    startActivity(intent)
                } catch (_: Exception) {
                    android.widget.Toast.makeText(this@MainActivity, "No PDF viewer is available", android.widget.Toast.LENGTH_SHORT).show()
                }
            }
        }
    }

    private val androidBridge = AndroidBridge()

    private fun openBlobPdf(blobUrl: String) {
        val quoted = org.json.JSONObject.quote(blobUrl)
        val script = """
            (async function(){
              try {
                const r = await fetch($quoted);
                const b = await r.blob();
                const reader = new FileReader();
                reader.onload = function(){
                  const s = String(reader.result || '');
                  const i = s.indexOf(',');
                  const data = i >= 0 ? s.slice(i + 1) : s;
                  window.ESIAndroid.openPdf('document.pdf', data);
                };
                reader.readAsDataURL(b);
              } catch(e) {
                console.error('Android cached PDF bridge error', e);
              }
            })();
        """.trimIndent()
        webView.evaluateJavascript(script, null)
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        webView = WebView(this)
        webView.layoutParams = ViewGroup.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.MATCH_PARENT
        )
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
            userAgentString = "$userAgentString ESIAndroid/2.1"
        }

        webView.addJavascriptInterface(androidBridge, "ESIAndroid")

        CookieManager.getInstance().setAcceptCookie(true)
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true)

        webView.webChromeClient = object : WebChromeClient() {
            override fun onJsAlert(view: WebView?, url: String?, message: String?, result: JsResult): Boolean {
                AlertDialog.Builder(this@MainActivity)
                    .setMessage(message ?: "")
                    .setPositiveButton("OK") { _, _ -> result.confirm() }
                    .setOnCancelListener { result.cancel() }
                    .show()
                return true
            }

            override fun onJsConfirm(view: WebView?, url: String?, message: String?, result: JsResult): Boolean {
                AlertDialog.Builder(this@MainActivity)
                    .setMessage(message ?: "")
                    .setPositiveButton("OK") { _, _ -> result.confirm() }
                    .setNegativeButton("Cancel") { _, _ -> result.cancel() }
                    .setOnCancelListener { result.cancel() }
                    .show()
                return true
            }
        }

        webView.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(
                view: WebView,
                request: WebResourceRequest
            ): WebResourceResponse? = localOrCachedAsset(request) ?: super.shouldInterceptRequest(view, request)

            override fun onPageFinished(view: WebView, url: String?) {
                super.onPageFinished(view, url)
                injectAppJs()
            }

            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                val uri = request.url
                if (uri.scheme == "http" || uri.scheme == "https") return false
                if (uri.scheme == "blob" && uri.toString().startsWith("blob:")) {
                    openBlobPdf(uri.toString())
                    return true
                }
                return try {
                    startActivity(Intent(Intent.ACTION_VIEW, uri))
                    true
                } catch (_: Exception) {
                    true
                }
            }
        }

        if (savedInstanceState == null) {
            webView.loadUrl(offlineHome)
        } else {
            webView.restoreState(savedInstanceState)
        }

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (webView.canGoBack()) webView.goBack() else finish()
            }
        })
    }

    override fun onSaveInstanceState(outState: Bundle) {
        webView.saveState(outState)
        super.onSaveInstanceState(outState)
    }

    override fun onDestroy() {
        webView.removeJavascriptInterface("ESIAndroid")
        webView.stopLoading()
        webView.webChromeClient = null
        (webView.parent as? ViewGroup)?.removeView(webView)
        webView.destroy()
        super.onDestroy()
    }
}