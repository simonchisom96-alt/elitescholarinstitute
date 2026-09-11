package com.elitescholarinstitute.app

import android.Manifest
import android.annotation.SuppressLint
import android.app.AlertDialog
import android.app.Dialog
import android.app.DownloadManager
import android.content.ContentValues
import android.content.Intent
import android.content.pm.PackageManager
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.provider.MediaStore
import android.util.Base64
import android.view.ViewGroup
import android.webkit.CookieManager
import android.webkit.JavascriptInterface
import android.webkit.JsResult
import android.webkit.MimeTypeMap
import android.webkit.URLUtil
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.activity.enableEdgeToEdge
import androidx.core.content.FileProvider
import com.pusher.pushnotifications.PushNotifications
import java.io.ByteArrayInputStream
import java.io.File
import java.io.FileNotFoundException
import java.io.FileOutputStream
import java.net.HttpURLConnection
import java.net.URL
import java.security.MessageDigest

class MainActivity : ComponentActivity() {
    private lateinit var webView: WebView
    private var authPopup: Dialog? = null
    private var fileChooserCallback: ValueCallback<Array<android.net.Uri>>? = null
    private val offlineHome = "https://appassets.androidplatform.net/index.html"
    private val onlineOrigin = "https://elitescholarinstitute.pages.dev"
    private val diskCache by lazy { File(cacheDir, "esi-web-cache").apply { mkdirs() } }
    private val shareDir by lazy { File(cacheDir, "shared").apply { mkdirs() } }
    private val fileChooserRequestCode = 41001

    private fun initializeBeams() {
        try {
            PushNotifications.start(applicationContext, "194482e6-d06b-4102-bd18-c8c32ca77565")
            PushNotifications.addDeviceInterest("esi-announcements")
        } catch (_: Exception) {
            // Keep the existing ESI startup path alive if Beams cannot initialize.
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
        ) {
            requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), 41002)
        }
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

    private fun resourceEncoding(path: String): String? = when (mimeType(path)) {
        "text/html", "application/javascript", "text/css", "application/json", "image/svg+xml" -> "UTF-8"
        else -> null
    }

    private fun cacheKey(pathAndQuery: String): String {
        val digest = MessageDigest.getInstance("SHA-256").digest(pathAndQuery.toByteArray())
        return digest.joinToString("") { "%02x".format(it) }
    }

    private fun bundledAsset(path: String): WebResourceResponse? = try {
        WebResourceResponse(mimeType(path), resourceEncoding(path), assets.open("site/$path"))
    } catch (_: FileNotFoundException) { null } catch (_: Exception) { null }

    private fun cachedAsset(pathAndQuery: String, path: String): WebResourceResponse? {
        val file = File(diskCache, cacheKey(pathAndQuery))
        if (!file.isFile || file.length() == 0L) return null
        return try { WebResourceResponse(mimeType(path), resourceEncoding(path), file.inputStream()) } catch (_: Exception) { null }
    }

    private fun networkAsset(pathAndQuery: String, path: String): WebResourceResponse? {
        var connection: HttpURLConnection? = null
        return try {
            val c = (URL(onlineOrigin + pathAndQuery).openConnection() as HttpURLConnection).apply {
                requestMethod = "GET"
                connectTimeout = 9000
                readTimeout = 15000
                useCaches = true
                instanceFollowRedirects = true
            }
            connection = c
            if (c.responseCode !in 200..299) return null
            val bytes = c.inputStream.use { it.readBytes() }
            if (bytes.isEmpty()) return null
            FileOutputStream(File(diskCache, cacheKey(pathAndQuery))).use { it.write(bytes) }
            WebResourceResponse(mimeType(path), resourceEncoding(path), ByteArrayInputStream(bytes))
        } catch (_: Exception) { null } finally { connection?.disconnect() }
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

    private fun sanitizeDownloadName(name: String, url: String, mime: String): String {
        val guessed = URLUtil.guessFileName(url, null, mime)
        val candidate = name.substringAfterLast('/').trim().ifBlank { guessed }
        return candidate.replace(Regex("[\\\\/:*?\"<>|]"), "_").ifBlank { guessed.ifBlank { "download" } }
    }

    private fun saveLocalDownload(name: String, mime: String, bytes: ByteArray) {
        val safeName = sanitizeDownloadName(name, name, mime)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            val values = ContentValues().apply {
                put(MediaStore.Downloads.DISPLAY_NAME, safeName)
                put(MediaStore.Downloads.MIME_TYPE, mime.ifBlank { "application/octet-stream" })
                put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS)
                put(MediaStore.Downloads.IS_PENDING, 1)
            }
            val uri = contentResolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values)
                ?: throw IllegalStateException("Unable to create download")
            try {
                contentResolver.openOutputStream(uri)?.use { it.write(bytes) }
                    ?: throw IllegalStateException("Unable to open download")
                val done = ContentValues().apply { put(MediaStore.Downloads.IS_PENDING, 0) }
                contentResolver.update(uri, done, null, null)
            } catch (e: Exception) {
                contentResolver.delete(uri, null, null)
                throw e
            }
        } else {
            val dir = getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS) ?: filesDir
            dir.mkdirs()
            File(dir, safeName).writeBytes(bytes)
        }
        runOnUiThread { Toast.makeText(this, "Downloaded: $safeName", Toast.LENGTH_SHORT).show() }
    }

    private fun downloadAppAsset(url: String, requestedName: String, requestedMime: String) {
        Thread {
            try {
                val uri = Uri.parse(url)
                val path = uri.path?.removePrefix("/") ?: throw FileNotFoundException("Missing asset path")
                val pathAndQuery = if (uri.query.isNullOrEmpty()) "/$path" else "/$path?${uri.query}"
                val mime = requestedMime.ifBlank { mimeType(path) }
                val name = sanitizeDownloadName(requestedName, path, mime)
                val bytes = try {
                    assets.open("site/$path").use { it.readBytes() }
                } catch (_: Exception) {
                    val cached = File(diskCache, cacheKey(pathAndQuery))
                    if (cached.isFile && cached.length() > 0L) {
                        cached.readBytes()
                    } else {
                        val response = networkAsset(pathAndQuery, path)
                            ?: throw FileNotFoundException("Unable to fetch $path")
                        response.data?.use { it.readBytes() }
                            ?: throw FileNotFoundException("Empty asset $path")
                    }
                }
                saveLocalDownload(name, mime, bytes)
            } catch (_: Exception) {
                runOnUiThread { Toast.makeText(this, "Download failed", Toast.LENGTH_SHORT).show() }
            }
        }.start()
    }

    private fun startNativeDownload(url: String, requestedName: String, requestedMime: String, contentDisposition: String? = null) {
        val uri = Uri.parse(url)
        val mime = requestedMime.ifBlank { mimeType(uri.path ?: url) }
        val guessedName = URLUtil.guessFileName(url, contentDisposition, mime)
        val name = sanitizeDownloadName(requestedName.ifBlank { guessedName }, url, mime)
        if (uri.host == "appassets.androidplatform.net") {
            downloadAppAsset(url, name, mime)
            return
        }
        if (uri.scheme == "http" || uri.scheme == "https") {
            try {
                val manager = getSystemService(DownloadManager::class.java)
                    ?: throw IllegalStateException("Download service unavailable")
                val request = DownloadManager.Request(uri).apply {
                    setTitle(name)
                    setDescription("Elite Scholar Institute")
                    setMimeType(mime)
                    setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
                    setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, name)
                    addRequestHeader("User-Agent", webView.settings.userAgentString)
                    val cookie = CookieManager.getInstance().getCookie(url)
                    if (!cookie.isNullOrBlank()) addRequestHeader("Cookie", cookie)
                }
                manager.enqueue(request)
                Toast.makeText(this, "Download started: $name", Toast.LENGTH_SHORT).show()
            } catch (_: Exception) {
                Toast.makeText(this, "Download failed", Toast.LENGTH_SHORT).show()
            }
            return
        }
        Toast.makeText(this, "Unsupported download", Toast.LENGTH_SHORT).show()
    }

    private fun injectAppJs() = webView.evaluateJavascript(buildAndroidBridgeJs(), null)

    private fun buildAndroidBridgeJs(): String = """
        (function(){
          if(!window.ESIAndroid || window.__esiAndroidBridgeInstalled) return;
          window.__esiAndroidBridgeInstalled = true;
          navigator.canShare = function(data){
            data = data || {};
            return !!(data.files && data.files.length) || !!data.text || !!data.url;
          };
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
                    const base64 = comma >= 0 ? result.slice(comma+1) : result;
                    const chunkSize = 180000;
                    window.ESIAndroid.beginShareFile(file.name || 'shared_file', file.type || 'application/octet-stream', data.title || '', data.text || '');
                    for(let i=0; i<base64.length; i+=chunkSize){
                      window.ESIAndroid.appendShareChunk(base64.slice(i, i+chunkSize));
                    }
                    window.ESIAndroid.finishShareFile();
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
          document.addEventListener('click', function(event){
            const a = event.target && event.target.closest ? event.target.closest('a[href]') : null;
            if(!a) return;
            const href = a.getAttribute('href') || '';
            if(/^https?:\/\/[^/]*(?:wa\.me|api\.whatsapp\.com)/i.test(href)) return;
          }, true);
        })();
    """.trimIndent()

    private inner class AndroidBridge {
        private var shareFile: File? = null
        private var shareName: String = "shared_file"
        private var shareMime: String = "application/octet-stream"
        private var shareTitle: String = ""
        private var shareText: String = ""
        private var downloadFile: File? = null
        private var downloadName: String = "download"
        private var downloadMime: String = "application/octet-stream"

        @JavascriptInterface
        fun beginShareFile(name: String, mime: String, title: String, text: String) {
            shareName = sanitizeDownloadName(name, name, mime)
            shareMime = mime.ifBlank { "application/octet-stream" }
            shareTitle = title
            shareText = text
            shareFile = File(shareDir, shareName).apply { parentFile?.mkdirs(); delete(); createNewFile() }
        }

        @JavascriptInterface
        fun appendShareChunk(base64: String) {
            val file = shareFile ?: return
            try { FileOutputStream(file, true).use { it.write(Base64.decode(base64, Base64.DEFAULT)) } } catch (_: Exception) { }
        }

        @JavascriptInterface
        fun finishShareFile() {
            val file = shareFile ?: return
            shareFile = null
            runOnUiThread { shareLocalFile(file, shareMime, shareTitle, shareText) }
        }

        @JavascriptInterface
        fun beginDownloadFile(name: String, mime: String) {
            downloadName = sanitizeDownloadName(name, name, mime)
            downloadMime = mime.ifBlank { "application/octet-stream" }
            downloadFile = File(shareDir, downloadName).apply { parentFile?.mkdirs(); delete(); createNewFile() }
        }

        @JavascriptInterface
        fun appendDownloadChunk(base64: String) {
            val file = downloadFile ?: return
            try { FileOutputStream(file, true).use { it.write(Base64.decode(base64, Base64.DEFAULT)) } } catch (_: Exception) { }
        }

        @JavascriptInterface
        fun finishDownloadFile() {
            val file = downloadFile ?: return
            downloadFile = null
            try {
                saveLocalDownload(downloadName, downloadMime, file.readBytes())
                file.delete()
            } catch (_: Exception) {
                runOnUiThread { Toast.makeText(this@MainActivity, "Download failed", Toast.LENGTH_SHORT).show() }
            }
        }

        @JavascriptInterface
        fun openPdf(name: String, base64: String) {
            try {
                val safeName = name.substringAfterLast('/').ifBlank { "document.pdf" }
                val file = File(shareDir, safeName)
                FileOutputStream(file, false).use { out ->
                    out.write(Base64.decode(base64, Base64.DEFAULT))
                    out.flush()
                }
                runOnUiThread { openLocalPdf(file) }
            } catch (_: Exception) {
                runOnUiThread { Toast.makeText(this@MainActivity, "Unable to open PDF", Toast.LENGTH_SHORT).show() }
            }
        }

        @JavascriptInterface
        fun share(title: String, text: String, url: String) {
            runOnUiThread {
                val safeUrl = if (url.startsWith("https://appassets.androidplatform.net/")) {
                    onlineOrigin + url.removePrefix("https://appassets.androidplatform.net")
                } else url
                val body = if (safeUrl.isBlank()) text else if (text.isBlank()) safeUrl else "$text\n$safeUrl"
                val intent = Intent(Intent.ACTION_SEND).apply {
                    type = "text/plain"
                    putExtra(Intent.EXTRA_SUBJECT, title)
                    putExtra(Intent.EXTRA_TEXT, body)
                }
                startActivity(Intent.createChooser(intent, "Share with"))
            }
        }
    }

    private val androidBridge = AndroidBridge()

    private fun openLocalPdf(file: File) {
        try {
            val uri = FileProvider.getUriForFile(this, "$packageName.fileprovider", file)
            val intent = Intent(Intent.ACTION_VIEW).apply {
                setDataAndType(uri, "application/pdf")
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }
            startActivity(Intent.createChooser(intent, "Open PDF with"))
        } catch (_: Exception) {
            Toast.makeText(this, "No PDF viewer is available", Toast.LENGTH_SHORT).show()
        }
    }

    private fun shareLocalFile(file: File, mime: String, title: String, text: String) {
        try {
            val uri = FileProvider.getUriForFile(this, "$packageName.fileprovider", file)
            val intent = Intent(Intent.ACTION_SEND).apply {
                type = mime.ifBlank { "application/octet-stream" }
                putExtra(Intent.EXTRA_STREAM, uri)
                if (text.isNotBlank()) putExtra(Intent.EXTRA_TEXT, text)
                if (title.isNotBlank()) putExtra(Intent.EXTRA_SUBJECT, title)
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }
            startActivity(Intent.createChooser(intent, "Share with"))
        } catch (_: Exception) {
            Toast.makeText(this, "Unable to share file", Toast.LENGTH_SHORT).show()
        }
    }

    private fun acceptFileChooser(callback: ValueCallback<Array<android.net.Uri>>?, params: WebChromeClient.FileChooserParams): Boolean {
        fileChooserCallback?.onReceiveValue(null)
        fileChooserCallback = callback
        val intent = try {
            params.createIntent().apply {
                addCategory(Intent.CATEGORY_OPENABLE)
                if (params.acceptTypes.isNotEmpty()) putExtra(Intent.EXTRA_MIME_TYPES, params.acceptTypes.filter { it.isNotBlank() }.toTypedArray())
            }
        } catch (_: Exception) {
            Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
                addCategory(Intent.CATEGORY_OPENABLE)
                type = "*/*"
            }
        }
        return try {
            startActivityForResult(intent, fileChooserRequestCode)
            true
        } catch (_: Exception) {
            fileChooserCallback?.onReceiveValue(null)
            fileChooserCallback = null
            false
        }
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        if (requestCode == fileChooserRequestCode) {
            val callback = fileChooserCallback
            fileChooserCallback = null
            if (callback != null) {
                val results = if (resultCode == RESULT_OK && data != null) {
                    WebChromeClient.FileChooserParams.parseResult(resultCode, data)
                } else null
                callback.onReceiveValue(results)
            }
            return
        }
        super.onActivityResult(requestCode, resultCode, data)
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        initializeBeams()
        webView = WebView(this)
        webView.layoutParams = ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT)
        setContentView(webView)

        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            allowFileAccess = false
            allowContentAccess = false
            javaScriptCanOpenWindowsAutomatically = true
            setSupportMultipleWindows(true)
            cacheMode = WebSettings.LOAD_DEFAULT
            mediaPlaybackRequiresUserGesture = true
            builtInZoomControls = false
            displayZoomControls = false
            userAgentString = "$userAgentString ESIAndroid/4.10"
        }
        webView.addJavascriptInterface(androidBridge, "ESIAndroid")
        CookieManager.getInstance().setAcceptCookie(true)
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true)
        webView.setDownloadListener { url, userAgent, contentDisposition, mimeType, _ ->
            startNativeDownload(url, URLUtil.guessFileName(url, contentDisposition, mimeType), mimeType, contentDisposition)
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onJsAlert(view: WebView?, url: String?, message: String?, result: JsResult): Boolean {
                AlertDialog.Builder(this@MainActivity).setMessage(message ?: "").setPositiveButton("OK") { _, _ -> result.confirm() }.setOnCancelListener { result.cancel() }.show()
                return true
            }
            override fun onJsConfirm(view: WebView?, url: String?, message: String?, result: JsResult): Boolean {
                AlertDialog.Builder(this@MainActivity).setMessage(message ?: "").setPositiveButton("OK") { _, _ -> result.confirm() }.setNegativeButton("Cancel") { _, _ -> result.cancel() }.setOnCancelListener { result.cancel() }.show()
                return true
            }
            override fun onShowFileChooser(view: WebView?, filePathCallback: ValueCallback<Array<android.net.Uri>>?, fileChooserParams: FileChooserParams?): Boolean {
                if (fileChooserParams == null) {
                    filePathCallback?.onReceiveValue(null)
                    return false
                }
                return acceptFileChooser(filePathCallback, fileChooserParams)
            }
            override fun onCreateWindow(view: WebView?, isDialog: Boolean, isUserGesture: Boolean, resultMsg: android.os.Message?): Boolean {
                if (!isUserGesture || resultMsg == null) return false
                val popup = WebView(this@MainActivity)
                popup.settings.javaScriptEnabled = true
                popup.settings.domStorageEnabled = true
                popup.settings.databaseEnabled = true
                popup.settings.javaScriptCanOpenWindowsAutomatically = true
                popup.settings.setSupportMultipleWindows(true)
                CookieManager.getInstance().setAcceptCookie(true)
                CookieManager.getInstance().setAcceptThirdPartyCookies(popup, true)
                val dialog = Dialog(this@MainActivity)
                popup.webViewClient = object : WebViewClient() {
                    override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                        val uri = request.url
                        if (uri.scheme == "whatsapp" || uri.host == "wa.me" || uri.host == "api.whatsapp.com") {
                            return try {
                                startActivity(Intent(Intent.ACTION_VIEW, uri))
                                true
                            } catch (_: Exception) {
                                false
                            }
                        }
                        return false
                    }
                }
                popup.webChromeClient = object : WebChromeClient() { override fun onCloseWindow(window: WebView?) { dialog.dismiss() } }
                dialog.setContentView(popup)
                dialog.setOnDismissListener { popup.stopLoading(); popup.destroy(); if (authPopup === dialog) authPopup = null }
                authPopup = dialog
                dialog.show()
                dialog.window?.setLayout(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT)
                (resultMsg.obj as? WebView.WebViewTransport)?.webView = popup
                resultMsg.sendToTarget()
                return true
            }
            override fun onCloseWindow(window: WebView?) { authPopup?.dismiss(); authPopup = null }
        }

        webView.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse? = localOrCachedAsset(request) ?: super.shouldInterceptRequest(view, request)
            override fun onPageFinished(view: WebView, url: String?) { super.onPageFinished(view, url); injectAppJs() }
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                val uri = request.url
                if (uri.scheme == "whatsapp" || uri.host == "wa.me" || uri.host == "api.whatsapp.com") {
                    return try {
                        startActivity(Intent(Intent.ACTION_VIEW, uri))
                        true
                    } catch (_: Exception) {
                        false
                    }
                }
                if (uri.scheme == "http" || uri.scheme == "https") return false
                if (uri.scheme == "blob" && uri.toString().startsWith("blob:")) {
                    val quoted = org.json.JSONObject.quote(uri.toString())
                    view.evaluateJavascript("fetch($quoted).then(r=>r.blob()).then(b=>{const x=new FileReader();x.onload=()=>{const s=String(x.result||'');window.ESIAndroid.beginDownloadFile('document.pdf','application/pdf');window.ESIAndroid.appendDownloadChunk(s.slice(s.indexOf(',')+1));window.ESIAndroid.finishDownloadFile()};x.readAsDataURL(b)})", null)
                    return true
                }
                return try { startActivity(Intent(Intent.ACTION_VIEW, uri)); true } catch (_: Exception) { true }
            }
        }

        if (savedInstanceState == null) webView.loadUrl(offlineHome) else webView.restoreState(savedInstanceState)
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() { if (webView.canGoBack()) webView.goBack() else finish() }
        })
    }

    override fun onSaveInstanceState(outState: Bundle) { webView.saveState(outState); super.onSaveInstanceState(outState) }

    override fun onDestroy() {
        fileChooserCallback?.onReceiveValue(null)
        fileChooserCallback = null
        authPopup?.dismiss(); authPopup = null
        webView.removeJavascriptInterface("ESIAndroid")
        webView.stopLoading(); webView.webChromeClient = null
        (webView.parent as? ViewGroup)?.removeView(webView)
        webView.destroy(); super.onDestroy()
    }
}