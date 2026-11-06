package com.skillect.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject

private val Blue = Color(0xFF315CF5)
private val Ink = Color(0xFF15213B)
private val client = OkHttpClient()
private const val URL = BuildConfig.SUPABASE_URL
private const val KEY = BuildConfig.SUPABASE_KEY

data class Post(val id: String, val body: String, val author: String, val handle: String, val image: String?)

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val prefs = getSharedPreferences("skillect-session", MODE_PRIVATE)
        setContent {
            MaterialTheme(colorScheme = lightColorScheme(primary = Blue, background = Color.White)) {
                SkillectApp(
                    initialToken = prefs.getString("token", null),
                    onToken = { token -> prefs.edit().putString("token", token).apply() },
                    onSignOut = { prefs.edit().clear().apply() }
                )
            }
        }
    }
}

@Composable
private fun SkillectApp(initialToken: String?, onToken: (String) -> Unit, onSignOut: () -> Unit) {
    var token by remember { mutableStateOf(initialToken) }
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var posts by remember { mutableStateOf<List<Post>>(emptyList()) }
    var refresh by remember { mutableIntStateOf(0) }
    val scope = rememberCoroutineScope()

    suspend fun signIn() {
        busy = true; error = null
        try {
            val json = JSONObject().put("email", email.trim()).put("password", password)
            val response = api("POST", "/auth/v1/token?grant_type=password", null, json)
            val newToken = response.getString("access_token")
            token = newToken; onToken(newToken)
        } catch (e: Exception) { error = e.message ?: "Sign in failed" }
        busy = false
    }

    LaunchedEffect(token, refresh) {
        if (token != null) {
            try {
                val arr = apiArray("/rest/v1/posts?select=id,content,image_url,profiles(display_name,username)&order=created_at.desc&limit=40", token!!)
                posts = (0 until arr.length()).map { i ->
                    val p = arr.getJSONObject(i); val profile = p.optJSONObject("profiles") ?: JSONObject()
                    Post(p.optString("id"), p.optString("content"), profile.optString("display_name", "Skillect member"), profile.optString("username", "member"), p.optString("image_url").ifBlank { null })
                }
            } catch (e: Exception) { error = e.message ?: "Could not load feed" }
        }
    }

    if (token == null) {
        Column(Modifier.fillMaxSize().background(Color.White).padding(horizontal = 28.dp), verticalArrangement = Arrangement.Center) {
            Text("Skillect", color = Blue, fontSize = 34.sp, fontWeight = FontWeight.ExtraBold)
            Text("Grow skills. Share progress. Build together.", color = Ink, modifier = Modifier.padding(top = 6.dp, bottom = 28.dp))
            OutlinedTextField(email, { email = it }, label = { Text("Email") }, modifier = Modifier.fillMaxWidth(), singleLine = true)
            Spacer(Modifier.height(12.dp))
            OutlinedTextField(password, { password = it }, label = { Text("Password") }, visualTransformation = PasswordVisualTransformation(), modifier = Modifier.fillMaxWidth(), singleLine = true)
            error?.let { Text(it, color = Color.Red, modifier = Modifier.padding(top = 10.dp)) }
            Button(onClick = { scope.launch { signIn() } }, enabled = !busy && email.isNotBlank() && password.isNotBlank(), modifier = Modifier.fillMaxWidth().padding(top = 20.dp), shape = RoundedCornerShape(14.dp)) {
                Text(if (busy) "Please wait…" else "Sign in")
            }
            Text("New accounts can be created on the existing Skillect sign-up flow. Confirm your email before signing in.", color = Color.Gray, fontSize = 12.sp, modifier = Modifier.padding(top = 14.dp))
        }
    } else {
        Scaffold(
            topBar = {
                Row(Modifier.fillMaxWidth().background(Color.White).padding(horizontal = 20.dp, vertical = 16.dp), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Text("Skillect", color = Blue, fontWeight = FontWeight.ExtraBold, fontSize = 25.sp)
                    TextButton(onClick = { token = null; onSignOut() }) { Text("Sign out") }
                }
            },
            bottomBar = {
                NavigationBar(containerColor = Color.White) {
                    NavigationBarItem(selected = true, onClick = {}, icon = { Text("⌂") }, label = { Text("Feed") })
                    NavigationBarItem(selected = false, onClick = {}, icon = { Text("⌕") }, label = { Text("Explore") })
                    NavigationBarItem(selected = false, onClick = {}, icon = { Text("+") }, label = { Text("Create") })
                    NavigationBarItem(selected = false, onClick = {}, icon = { Text("◉") }, label = { Text("Profile") })
                }
            }
        ) { padding ->
            Column(Modifier.fillMaxSize().background(Color(0xFFF8FAFF)).padding(padding)) {
                Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 10.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("Your learning feed", fontSize = 20.sp, fontWeight = FontWeight.Bold, color = Ink)
                    TextButton(onClick = { refresh++ }) { Text("Refresh") }
                }
                error?.let { Text(it, color = Color.Red, modifier = Modifier.padding(horizontal = 16.dp)) }
                if (posts.isEmpty()) {
                    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Text("Your feed is ready for your first idea.", color = Color.Gray)
                    }
                } else LazyColumn(contentPadding = PaddingValues(14.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    items(posts, key = { it.id }) { post ->
                        Card(colors = CardDefaults.cardColors(containerColor = Color.White), shape = RoundedCornerShape(18.dp), modifier = Modifier.fillMaxWidth()) {
                            Column(Modifier.padding(18.dp)) {
                                Text(post.author, fontWeight = FontWeight.Bold, color = Ink)
                                Text("@${post.handle}", color = Color.Gray, fontSize = 12.sp)
                                Text(post.body, color = Ink, modifier = Modifier.padding(top = 12.dp), lineHeight = 22.sp)
                                post.image?.let { Text("Media attached", color = Blue, fontSize = 12.sp, modifier = Modifier.padding(top = 10.dp)) }
                            }
                        }
                    }
                }
            }
        }
    }
}

private suspend fun api(method: String, path: String, token: String?, json: JSONObject): JSONObject = withContext(Dispatchers.IO) {
    val body = json.toString().toRequestBody("application/json".toMediaType())
    val builder = Request.Builder().url(URL + path).addHeader("apikey", KEY).addHeader("Content-Type", "application/json").method(method, body)
    if (token != null) builder.addHeader("Authorization", "Bearer $token")
    client.newCall(builder.build()).execute().use { response ->
        val text = response.body?.string().orEmpty()
        if (!response.isSuccessful) throw IllegalStateException(JSONObject(text).optString("msg", JSONObject(text).optString("message", "Request failed (${response.code})")))
        JSONObject(text)
    }
}

private suspend fun apiArray(path: String, token: String): JSONArray = withContext(Dispatchers.IO) {
    val request = Request.Builder().url(URL + path).addHeader("apikey", KEY).addHeader("Authorization", "Bearer $token").build()
    client.newCall(request).execute().use { response ->
        val text = response.body?.string().orEmpty()
        if (!response.isSuccessful) throw IllegalStateException("Feed request failed (${response.code})")
        JSONArray(text)
    }
}
