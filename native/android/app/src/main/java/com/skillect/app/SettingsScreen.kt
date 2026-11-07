package com.skillect.app

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@Composable
fun SettingsScreen(
    isPrivate: Boolean,
    onTogglePrivate: (Boolean) -> Unit,
    blocked: List<SimpleItem>,
    onRefreshBlocked: () -> Unit,
    onUnblock: (String) -> Unit,
    onSignOut: () -> Unit,
    versionName: String,
) {
    LazyColumn(
        Modifier.fillMaxSize().padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            Text("Settings", fontSize = 22.sp, fontWeight = FontWeight.Bold, color = Color(0xFFF2F2F2))
            Text("Privacy and account controls", color = Color(0xFF94A3B8), fontSize = 13.sp)
        }
        item {
            Card(colors = CardDefaults.cardColors(containerColor = Color(0xFF10243D))) {
                Row(
                    Modifier.fillMaxWidth().padding(16.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(Modifier.weight(1f)) {
                        Text("Private profile", fontWeight = FontWeight.Bold, color = Color(0xFFF2F2F2))
                        Text("Only people you approve can see more of your activity.", color = Color(0xFF94A3B8), fontSize = 12.sp)
                    }
                    Switch(checked = isPrivate, onCheckedChange = onTogglePrivate)
                }
            }
        }
        item {
            Text("Blocked accounts", fontWeight = FontWeight.Bold, color = Color(0xFFF2F2F2))
            TextButton(onClick = onRefreshBlocked) { Text("Refresh blocked list") }
        }
        if (blocked.isEmpty()) {
            item { Text("No blocked accounts.", color = Color(0xFF94A3B8)) }
        } else {
            items(blocked, key = { it.id }) { person ->
                Card(colors = CardDefaults.cardColors(containerColor = Color(0xFF10243D))) {
                    Row(
                        Modifier.fillMaxWidth().padding(14.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text(person.title, color = Color(0xFFF2F2F2), fontWeight = FontWeight.Bold)
                            Text(person.detail, color = Color(0xFF94A3B8), fontSize = 12.sp)
                        }
                        TextButton(onClick = { onUnblock(person.id) }) { Text("Unblock") }
                    }
                }
            }
        }
        item {
            Text("Account", fontWeight = FontWeight.Bold, color = Color(0xFFF2F2F2), modifier = Modifier.padding(top = 8.dp))
            Text(
                "To delete your account permanently, email support@skillect.app from your registered email with subject DELETE ACCOUNT. We remove profile data and posts per our privacy policy.",
                color = Color(0xFF94A3B8),
                fontSize = 12.sp,
                modifier = Modifier.padding(top = 6.dp)
            )
            Text("Skillect $versionName", color = Color(0xFF94A3B8), fontSize = 12.sp, modifier = Modifier.padding(top = 12.dp))
            TextButton(onClick = onSignOut) { Text("Sign out", color = Color.Red) }
        }
    }
}
