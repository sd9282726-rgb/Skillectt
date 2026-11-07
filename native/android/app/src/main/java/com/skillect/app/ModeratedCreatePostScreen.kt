package com.skillect.app

import android.content.Context
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.MultipartBody
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject
import java.util.UUID

private const val MODERATION_BASE = BuildConfig.SUPABASE_URL
private const val MODERATION_KEY = BuildConfig.SUPABASE_KEY
private val moderationClient = OkHttpClient()

@Composable
fun ModeratedCreatePostScreen(
    token: String,
    userId: String,
    onPublished: () -> Unit
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var caption by remember { mutableStateOf("") }
    var mediaUri by remember { mutableStateOf<Uri?>(null) }
    var mediaKind by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }
    var message by remember { mutableStateOf<String?>(null) }

    val picker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        mediaUri = uri
        message = if (uri == null) "No file selected" else "Media selected. It will be screened after publishing."
    }

    Column(
        Modifier.fillMaxSize().padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Text("Create a post", style = MaterialTheme.typography.headlineSmall)
        Text("Share what you are learning, building, or working on.")
        OutlinedTextField(
            value = caption,
            onValueChange = { caption = it },
            label = { Text("Write a caption") },
            modifier = Modifier.fillMaxWidth().heightIn(min = 120.dp),
            maxLines = 7
        )
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            OutlinedButton(onClick = { mediaKind = "image"; picker.launch("image/*") }, enabled = !busy) {
                Text("Choose image")
            }
            OutlinedButton(onClick = { mediaKind = "video"; picker.launch("video/*") }, enabled = !busy) {
                Text("Choose video")
            }
        }
        mediaUri?.let {
            Text(if (mediaKind == "video") "Video selected" else "Image selected")
            TextButton(onClick = { mediaUri = null; mediaKind = null }) { Text("Remove media") }
        }
        message?.let { Text(it, color = MaterialTheme.colorScheme.secondary) }
        Button(
            onClick = {
                scope.launch {
                    busy = true
                    message = "Checking content safety…"
                    try {
                        val result = withContext(Dispatchers.IO) {
                            val text = caption.trim()
                            if (text.isNotEmpty()) validateCaption(token, text)
                            when (mediaKind) {
                                "image" -> {
                                    val uri = mediaUri ?: error("Choose an image first")
                                    publishImage(context, token, uri, text)
                                }
                                "video" -> {
                                    val uri = mediaUri ?: error("Choose a video first")
                                    publishVideo(context, token, userId, uri, text)
                                }
                                else -> publishText(token, text)
                            }
                        }
                        message = result
                        caption = ""
                        mediaUri = null
                        mediaKind = null
                        onPublished()
                    } catch (e: Exception) {
                        message = e.message ?: "Could not publish. Please try again."
                    } finally {
                        busy = false
                    }
                }
            },
            enabled = !busy && (caption.isNotBlank() || mediaUri != null),
            modifier = Modifier.fillMaxWidth()
        ) {
            Text(if (busy) "Publishing…" else "Publish")
        }
        Text(
            "Text is checked before it is posted. Images and videos publish immediately, then automated moderation runs in the background. Flagged media is hidden for review.",
            style = MaterialTheme.typography.bodySmall
        )
    }
}

private fun authBuilder(path: String, token: String): Request.Builder =
    Request.Builder()
        .url(MODERATION_BASE + path)
        .addHeader("apikey", MODERATION_KEY)
        .addHeader("Authorization", "Bearer $token")

private fun responseJson(request: Request): JSONObject {
    moderationClient.newCall(request).execute().use { response ->
        val body = response.body?.string().orEmpty()
        if (!response.isSuccessful) {
            val detail = try {
                val json = JSONObject(body)
                val categories = json.optJSONArray("categories")
                val suffix = if (categories != null && categories.length() > 0) {
                    ": " + (0 until categories.length()).joinToString(", ") { categories.optString(it) }
                } else ""
                json.optString("error", "Request failed (${response.code})") + suffix
            } catch (_: Exception) {
                "Request failed (${response.code})"
            }
            throw IllegalStateException(detail)
        }
        return if (body.isBlank()) JSONObject() else JSONObject(body)
    }
}

private fun validateCaption(token: String, caption: String) {
    val payload = JSONObject().put("type", "media_caption").put("content", caption)
    val request = authBuilder("/functions/v1/moderate-text", token)
        .post(payload.toString().toRequestBody("application/json".toMediaType()))
        .build()
    val result = responseJson(request)
    if (result.optString("status") != "approved") throw IllegalStateException("Caption did not pass the safety check")
}

private fun publishText(token: String, caption: String): String {
    if (caption.isBlank()) throw IllegalStateException("Write something before publishing")
    val payload = JSONObject()
        .put("type", "post")
        .put("content", caption)
        .put("tags", JSONArray())
    val request = authBuilder("/functions/v1/moderate-text", token)
        .post(payload.toString().toRequestBody("application/json".toMediaType()))
        .build()
    responseJson(request)
    return "Post published successfully."
}

private fun publishImage(context: Context, token: String, uri: Uri, caption: String): String {
    val mime = context.contentResolver.getType(uri) ?: throw IllegalStateException("Could not identify this image")
    val extension = when (mime.lowercase()) {
        "image/jpeg" -> "jpg"
        "image/png" -> "png"
        "image/webp" -> "webp"
        "image/heic" -> "heic"
        "image/heif" -> "heif"
        else -> throw IllegalStateException("Choose a JPG, PNG, WebP, or HEIC image")
    }
    val bytes = context.contentResolver.openInputStream(uri)?.use { it.readBytes() }
        ?: throw IllegalStateException("Could not read the selected image")
    if (bytes.isEmpty() || bytes.size > 12 * 1024 * 1024) {
        throw IllegalStateException("Images must be 12 MB or smaller")
    }
    val body = MultipartBody.Builder()
        .setType(MultipartBody.FORM)
        .addFormDataPart("file", "upload.$extension", bytes.toRequestBody(mime.toMediaType()))
        .addFormDataPart("content", caption)
        .build()
    val request = authBuilder("/functions/v1/moderate-media", token).post(body).build()
    val result = responseJson(request)
    return when (result.optString("status")) {
        "published_moderating" -> "Image post published. Automated safety screening is running in the background."
        else -> "Image post submitted. Check the feed for its current status."
    }
}

private fun publishVideo(context: Context, token: String, userId: String, uri: Uri, caption: String): String {
    val mime = context.contentResolver.getType(uri) ?: throw IllegalStateException("Could not identify this video")
    val extension = when (mime.lowercase()) {
        "video/mp4" -> "mp4"
        "video/webm" -> "webm"
        "video/quicktime" -> "mov"
        else -> throw IllegalStateException("Choose an MP4, WebM, or MOV video")
    }
    val bytes = context.contentResolver.openInputStream(uri)?.use { it.readBytes() }
        ?: throw IllegalStateException("Could not read the selected video")
    if (bytes.isEmpty() || bytes.size > 50 * 1024 * 1024) {
        throw IllegalStateException("Videos must be 50 MB or smaller")
    }
    val path = userId + "/" + UUID.randomUUID().toString() + "." + extension
    val upload = authBuilder("/storage/v1/object/media-quarantine/" + path, token)
        .addHeader("Content-Type", mime)
        .addHeader("x-upsert", "false")
        .post(bytes.toRequestBody(mime.toMediaType()))
        .build()
    moderationClient.newCall(upload).execute().use { response ->
        if (!response.isSuccessful) throw IllegalStateException("Could not upload the video to private quarantine (${response.code})")
    }
    val payload = JSONObject().put("storage_path", path).put("content", caption)
    val submit = authBuilder("/functions/v1/submit-video-post", token)
        .post(payload.toString().toRequestBody("application/json".toMediaType()))
        .build()
    val result = responseJson(submit)
    return when (result.optString("status")) {
        "published_moderating" -> "Video post published. Automated video screening is running in the background."
        "published_pending_review" -> "Video post was submitted and hidden for moderator review because automated screening could not start."
        else -> "Video post submitted. Check the feed for its current status."
    }
}
