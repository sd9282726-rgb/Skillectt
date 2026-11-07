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

private val AuthBlue = Color(0xFF00C878)
private val AuthInk = Color(0xFFF2F2F2)
private val AuthBg = Color(0xFF050509)

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
            "Skills-first social for teens learning and building.",
            color = AuthInk,
            modifier = Modifier.padding(top = 6.dp, bottom = 20.dp)
        )
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Button(
                onClick = { mode = "signin"; localError = null; onClearError() },
                colors = ButtonDefaults.buttonColors(
                    containerColor = if (mode == "signin") AuthBlue else Color(0xFF333344)
                )
            ) { Text("Sign in") }
            Button(
                onClick = { mode = "signup"; localError = null; onClearError() },
                colors = ButtonDefaults.buttonColors(
                    containerColor = if (mode == "signup") AuthBlue else Color(0xFF333344)
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
                "Skillect is for ages 13–19. Your birth date stays private.",
                color = Color.Gray,
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
                            if (dob.trim().length < 8) error("Enter date of birth as YYYY-MM-DD")
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
        Text("Step ${step + 1} of 3", color = Color.Gray, modifier = Modifier.padding(bottom = 16.dp))
        when (step) {
            0 -> {
                OutlinedTextField(displayName, onDisplayName, label = { Text("Display name") }, modifier = Modifier.fillMaxWidth())
                Spacer(Modifier.height(12.dp))
                OutlinedTextField(username, onUsername, label = { Text("Username") }, modifier = Modifier.fillMaxWidth())
            }
            1 -> {
                OutlinedTextField(dateOfBirth, onDateOfBirth, label = { Text("Date of birth YYYY-MM-DD") }, modifier = Modifier.fillMaxWidth())
                Text("Required. Ages 13–19 only. Never shown publicly.", color = Color.Gray, fontSize = 12.sp, modifier = Modifier.padding(top = 8.dp))
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
