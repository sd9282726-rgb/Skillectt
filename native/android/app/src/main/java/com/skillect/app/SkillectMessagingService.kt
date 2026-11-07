package com.skillect.app

import android.app.Notification
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Intent
import android.os.Build
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject

class SkillectMessagingService : FirebaseMessagingService() {
    private val http = OkHttpClient()

    override fun onNewToken(token: String) {
        super.onNewToken(token)
        Thread { registerToken(token) }.start()
    }

    override fun onMessageReceived(message: RemoteMessage) {
        super.onMessageReceived(message)
        val launch = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val pending = PendingIntent.getActivity(
            this,
            7302,
            launch,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        val notification = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Notification.Builder(this, "skillect_activity")
                .setSmallIcon(android.R.drawable.ic_dialog_info)
                .setContentTitle("Skillect")
                .setContentText("You have new activity")
                .setAutoCancel(true)
                .setContentIntent(pending)
                .build()
        } else {
            @Suppress("DEPRECATION")
            Notification.Builder(this)
                .setSmallIcon(android.R.drawable.ic_dialog_info)
                .setContentTitle("Skillect")
                .setContentText("You have new activity")
                .setAutoCancel(true)
                .setContentIntent(pending)
                .build()
        }
        getSystemService(NotificationManager::class.java)
            .notify((System.currentTimeMillis() % Int.MAX_VALUE).toInt(), notification)
    }

    private fun registerToken(fcmToken: String) {
        val session = getSharedPreferences("skillect-session", MODE_PRIVATE)
            .getString("token", null) ?: return
        try {
            val userRequest = Request.Builder()
                .url(BuildConfig.SUPABASE_URL + "/auth/v1/user")
                .addHeader("apikey", BuildConfig.SUPABASE_KEY)
                .addHeader("Authorization", "Bearer $session")
                .get()
                .build()
            val userId = http.newCall(userRequest).execute().use { response ->
                if (!response.isSuccessful) return
                JSONObject(response.body?.string().orEmpty()).optString("id")
            }
            if (userId.isBlank()) return
            val body = JSONObject()
                .put("user_id", userId)
                .put("platform", "android")
                .put("token", fcmToken)
                .toString()
                .toRequestBody("application/json".toMediaType())
            val upsert = Request.Builder()
                .url(BuildConfig.SUPABASE_URL + "/rest/v1/device_tokens?on_conflict=platform,token")
                .addHeader("apikey", BuildConfig.SUPABASE_KEY)
                .addHeader("Authorization", "Bearer $session")
                .addHeader("Content-Type", "application/json")
                .addHeader("Prefer", "resolution=merge-duplicates,return=minimal")
                .post(body)
                .build()
            http.newCall(upsert).execute().use { /* RLS and PostgREST enforce ownership */ }
        } catch (_: Exception) {
            // Token registration is retried on the next token refresh or app sign-in.
        }
    }
}
