package com.skillect.app

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@Composable
fun CommunityCreateForm(
    name: String,
    onName: (String) -> Unit,
    description: String,
    onDescription: (String) -> Unit,
    enabled: Boolean,
    onCreate: () -> Unit,
) {
    Column(Modifier.fillMaxWidth().padding(bottom = 12.dp)) {
        Text("Create a community", fontWeight = FontWeight.Bold, color = Color(0xFFF2F2F2), fontSize = 18.sp)
        Text(
            "Groups for skills, projects, and learning together.",
            color = Color.Gray,
            fontSize = 13.sp,
            modifier = Modifier.padding(bottom = 8.dp)
        )
        OutlinedTextField(
            value = name,
            onValueChange = onName,
            label = { Text("Community name") },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true
        )
        Spacer(Modifier.height(8.dp))
        OutlinedTextField(
            value = description,
            onValueChange = onDescription,
            label = { Text("Description") },
            modifier = Modifier.fillMaxWidth(),
            maxLines = 3
        )
        Button(
            onClick = onCreate,
            enabled = enabled && name.trim().length >= 2,
            modifier = Modifier.padding(top = 10.dp)
        ) { Text("Create community") }
    }
}
