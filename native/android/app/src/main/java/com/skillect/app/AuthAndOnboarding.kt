package com.skillect.app

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.launch
import java.util.Calendar
import java.util.GregorianCalendar

private val AuthBlue = Color(0xFF72B7FF)
private val AuthInk = Color(0xFFF2F2F2)
private val AuthBg = Color(0xFF07172B)
private val AuthMuted = Color(0xFF94A3B8)

internal fun isAtLeast16(value: String): Boolean {
    return try {
        val parts = value.split("-")
        if (parts.size != 3) return false
        val year = parts[0].toInt()
        val month = parts[1].toInt()
        val day = parts[2].toInt()
        val birth = GregorianCalendar(year, month - 1, day).apply { isLenient = false }
        birth.time
        val today = Calendar.getInstance()
        var age = today.get(Calendar.YEAR) - year
        if (today.get(Calendar.MONTH) < month - 1 ||
            (today.get(Calendar.MONTH) == month - 1 && today.get(Calendar.DAY_OF_MONTH) < day)) age--
        age >= 16 && !birth.after(today)
    } catch (_: Exception) { false }
}

@Composable
fun AuthGate(
    busy: Boolean,
    error: String?,
    onClearError: () -> Unit,
    onSignedIn: (accessToken: String) -> Unit,
    apiPost: suspend (path: String, token: String?, body: org.json.JSONObject?) -> org.json.JSONObject,
) {
    var mode by remember { mutableStateOf("signin") }
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var displayName by remember { mutableStateOf("") }
    var username by remember { mutableStateOf("") }
    var dob by remember { mutableStateOf("") }
    var localBusy by remember { mutableStateOf(false) }
    var localError by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()
    val working = busy || localBusy
    val err = localError ?: error

    Column(
        Modifier
            .fillMaxSize()
            .background(AuthBg)
            .padding(horizontal = 28.dp)
            .verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.Center
    ) {
        Text("Skillect", color = AuthBlue, fontSize = 34.sp, fontWeight = FontWeight.ExtraBold)
        Text(
            "A worldwide space to share skills, projects and ideas.",
            color = AuthInk,
            modifier = Modifier.padding(top = 6.dp, bottom = 20.dp)
        )
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Button(
                onClick = { mode = "signin"; localError = null; onClearError() },
                colors = ButtonDefaults.buttonColors(
                    containerColor = if (mode == "signin") AuthBlue else Color(0xFF17314F)
                )
            ) { Text("Sign in") }
            Button(
                onClick = { mode = "signup"; localError = null; onClearError() },
                colors = ButtonDefaults.buttonColors(
                    containerColor = if (mode == "signup") AuthBlue else Color(0xFF17314F)
                )
            ) { Text("Sign up") }
        }
        Spacer(Modifier.height(12.dp))
        OutlinedTextField(email, { email = it }, label = { Text("Email") }, modifier = Modifier.fillMaxWidth(), singleLine = true)
        Spacer(Modifier.height(12.dp))
        OutlinedTextField(
            password,
            { password = it },
            label = { Text("Password") },
            visualTransformation = PasswordVisualTransformation(),
            modifier = Modifier.fillMaxWidth(),
            singleLine = true
        )
        if (mode == "signup") {
            Spacer(Modifier.height(12.dp))
            OutlinedTextField(displayName, { displayName = it }, label = { Text("Display name") }, modifier = Modifier.fillMaxWidth(), singleLine = true)
            Spacer(Modifier.height(12.dp))
            OutlinedTextField(username, { username = it }, label = { Text("Username") }, modifier = Modifier.fillMaxWidth(), singleLine = true)
            Spacer(Modifier.height(12.dp))
            OutlinedTextField(dob, { dob = it }, label = { Text("Date of birth (YYYY-MM-DD)") }, modifier = Modifier.fillMaxWidth(), singleLine = true)
            Text(
                "Skillect is for people aged 16 and above. Your birth date stays private.",
                color = AuthMuted,
                fontSize = 12.sp,
                modifier = Modifier.padding(top = 6.dp)
            )
        }
        err?.let { Text(it, color = Color.Red, modifier = Modifier.padding(top = 10.dp)) }
        Button(
            onClick = {
                scope.launch {
                    localBusy = true
                    localError = null
                    onClearError()
                    try {
                        if (mode == "signup") {
                            if (!isAtLeast16(dob.trim())) error("Skillect is for people aged 16 and above. Enter a valid date of birth.")
                            val meta = org.json.JSONObject()
                                .put("display_name", displayName.ifBlank { email.substringBefore("@") })
                                .put("username", username.ifBlank { "user_" + System.currentTimeMillis().toString().takeLast(6) })
                                .put("date_of_birth", dob.trim())
                            val body = org.json.JSONObject()
                                .put("email", email.trim())
                                .put("password", password)
                                .put("data", meta)
                            apiPost("/auth/v1/signup", null, body)
                            localError = "Check your email to confirm, then sign in."
                            mode = "signin"
                        } else {
                            val auth = apiPost(
                                "/auth/v1/token?grant_type=password",
                                null,
                                org.json.JSONObject().put("email", email.trim()).put("password", password)
                            )
                            onSignedIn(auth.getString("access_token"))
                        }
                    } catch (e: Exception) {
                        localError = e.message ?: "Auth failed"
                    }
                    localBusy = false
                }
            },
            enabled = !working && email.isNotBlank() && password.length >= 6,
            modifier = Modifier.fillMaxWidth().padding(top = 20.dp),
            shape = RoundedCornerShape(14.dp)
        ) {
            Text(
                when {
                    working -> "Please wait…"
                    mode == "signup" -> "Create account"
                    else -> "Sign in"
                }
            )
        }
        if (mode == "signin") {
            TextButton(
                onClick = {
                    scope.launch {
                        localBusy = true
                        localError = null
                        try {
                            if (email.isBlank()) error("Enter your email address first")
                            apiPost("/auth/v1/recover", null, org.json.JSONObject().put("email", email.trim()))
                            localError = "If that account exists, password reset instructions have been sent."
                        } catch (e: Exception) {
                            localError = e.message ?: "Could not request a password reset"
                        }
                        localBusy = false
                    }
                },
                enabled = !working && email.isNotBlank(),
                modifier = Modifier.fillMaxWidth()
            ) { Text("Forgot password?") }
        }
        Spacer(Modifier.height(40.dp))
    }
}

@Composable
fun OnboardingGate(
    displayName: String,
    onDisplayName: (String) -> Unit,
    username: String,
    onUsername: (String) -> Unit,
    bio: String,
    onBio: (String) -> Unit,
    dateOfBirth: String,
    onDateOfBirth: (String) -> Unit,
    busy: Boolean,
    error: String?,
    onFinish: () -> Unit,
) {
    var step by remember { mutableIntStateOf(0) }
    Column(Modifier.fillMaxSize().background(AuthBg).padding(28.dp)) {
        Text("Finish your profile", color = AuthBlue, fontSize = 28.sp, fontWeight = FontWeight.Bold)
        Text("Step ${step + 1} of 3", color = AuthMuted, modifier = Modifier.padding(bottom = 16.dp))
        when (step) {
            0 -> {
                OutlinedTextField(displayName, onDisplayName, label = { Text("Display name") }, modifier = Modifier.fillMaxWidth())
                Spacer(Modifier.height(12.dp))
                OutlinedTextField(username, onUsername, label = { Text("Username") }, modifier = Modifier.fillMaxWidth())
            }
            1 -> {
                OutlinedTextField(dateOfBirth, onDateOfBirth, label = { Text("Date of birth YYYY-MM-DD") }, modifier = Modifier.fillMaxWidth())
                Text("Required for age verification (16+). Never shown publicly.", color = AuthMuted, fontSize = 12.sp, modifier = Modifier.padding(top = 8.dp))
            }
            else -> {
                OutlinedTextField(bio, onBio, label = { Text("Short bio") }, modifier = Modifier.fillMaxWidth().height(120.dp))
            }
        }
        error?.let { Text(it, color = Color.Red, modifier = Modifier.padding(top = 8.dp)) }
        Row(Modifier.fillMaxWidth().padding(top = 20.dp), horizontalArrangement = Arrangement.SpaceBetween) {
            if (step > 0) TextButton(onClick = { step -= 1 }) { Text("Back") } else Spacer(Modifier.width(8.dp))
            Button(
                onClick = {
                    if (step < 2) step += 1 else onFinish()
                },
                enabled = !busy
            ) {
                Text(if (step < 2) "Continue" else if (busy) "Saving…" else "Enter Skillect")
            }
        }
    }
}
