#!/usr/bin/env python3
"""Apply signup/onboarding/community-create hooks to MainActivity.kt"""
from pathlib import Path
import sys

p = Path(sys.argv[1] if len(sys.argv) > 1 else "native/android/app/src/main/java/com/skillect/app/MainActivity.kt")
t = p.read_text()
if "AuthGate(" in t:
    print("already patched")
    sys.exit(0)

t = t.replace(
    'var email by remember { mutableStateOf("") }\n    var password by remember { mutableStateOf("") }',
    '''var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var onboarded by remember { mutableStateOf(true) }
    var dateOfBirth by remember { mutableStateOf("") }
    var communityName by remember { mutableStateOf("") }
    var communityDesc by remember { mutableStateOf("") }''',
)

t = t.replace(
    'val arr = apiArray("/rest/v1/profiles?select=display_name,username,bio&id=eq.$id&limit=1", active)\n            if (arr.length() > 0) {\n                val p = arr.getJSONObject(0)\n                displayName = p.optString("display_name")\n                username = p.optString("username")\n                bio = p.optString("bio")\n            }',
    '''val arr = apiArray("/rest/v1/profiles?select=display_name,username,bio,onboarded,date_of_birth&id=eq.$id&limit=1", active)
            if (arr.length() > 0) {
                val p = arr.getJSONObject(0)
                displayName = p.optString("display_name")
                username = p.optString("username")
                bio = p.optString("bio")
                onboarded = p.optBoolean("onboarded", true)
                if (!p.isNull("date_of_birth")) dateOfBirth = p.optString("date_of_birth")
            } else {
                onboarded = false
            }''',
)

old_join = '''    suspend fun joinCommunity(id: String) {
        val active = token ?: return
        val me = userId ?: return
        try {
            api("POST", "/rest/v1/community_members", active, JSONObject().put("community_id", id).put("user_id", me))
            error = null
        } catch (e: Exception) { error = e.message }
    }'''

new_join = '''    suspend fun joinCommunity(id: String) {
        val active = token ?: return
        val me = userId ?: return
        try {
            api("POST", "/rest/v1/community_members", active, JSONObject().put("community_id", id).put("user_id", me).put("role", "member").put("status", "active"))
            error = null
            loadCommunities()
        } catch (e: Exception) { error = e.message }
    }

    suspend fun createCommunity() {
        val active = token ?: return
        val me = userId ?: return
        val name = communityName.trim()
        if (name.length < 2) { error = "Community name must be at least 2 characters"; return }
        try {
            val slugBase = name.lowercase().replace(Regex("[^a-z0-9]+"), "-").trim('-').take(40).ifBlank { "community" }
            val slug = slugBase + "-" + me.take(6)
            api(
                "POST",
                "/rest/v1/communities",
                active,
                JSONObject()
                    .put("name", name)
                    .put("slug", slug)
                    .put("description", communityDesc.trim())
                    .put("created_by", me)
                    .put("is_private", false)
            )
            communityName = ""
            communityDesc = ""
            loadCommunities()
            error = null
        } catch (e: Exception) { error = e.message }
    }

    suspend fun completeOnboarding() {
        val active = token ?: return
        val me = userId ?: return
        busy = true
        error = null
        try {
            api(
                "PATCH",
                "/rest/v1/profiles?id=eq.$me",
                active,
                JSONObject()
                    .put("display_name", displayName.trim().ifBlank { "Skillect member" })
                    .put("username", username.trim().ifBlank { "user_" + me.take(8) })
                    .put("bio", bio)
                    .put("date_of_birth", dateOfBirth.trim())
                    .put("onboarded", true)
            )
            onboarded = true
        } catch (e: Exception) { error = e.message }
        busy = false
    }'''

if old_join in t:
    t = t.replace(old_join, new_join)
else:
    print("WARN: joinCommunity block not found")

marker = '    if (token == null) {\n        Column(Modifier.fillMaxSize().background(SkillectBlack).padding(horizontal=28.dp), verticalArrangement=Arrangement.Center) {'
else_marker = '\n    } else {\n        Scaffold('
if marker in t:
    start = t.find(marker)
    end = t.find(else_marker, start)
    if end > 0:
        replacement = '''    if (token == null) {
        AuthGate(
            busy = busy,
            error = error,
            onClearError = { error = null },
            onSignedIn = { newToken -> token = newToken; onToken(newToken) },
            apiPost = { path, tok, body -> api("POST", path, tok, body) }
        )
    } else if (!onboarded) {
        OnboardingGate(
            displayName = displayName,
            onDisplayName = { displayName = it },
            username = username,
            onUsername = { username = it },
            bio = bio,
            onBio = { bio = it },
            dateOfBirth = dateOfBirth,
            onDateOfBirth = { dateOfBirth = it },
            busy = busy,
            error = error,
            onFinish = { scope.launch { completeOnboarding() } }
        )
    } else {
        Scaffold('''
        t = t[:start] + replacement + t[end + len(else_marker):]
    else:
        print("WARN: else Scaffold not found")
else:
    print("WARN: auth UI marker not found")

old_c = '''                    "Communities" -> LazyColumn(Modifier.fillMaxSize().padding(16.dp)) {
                        item { Text("Communities",fontSize=20.sp,fontWeight=FontWeight.Bold,color=Ink) }
                        items(communities){ item -> Card(Modifier.fillMaxWidth().padding(vertical=6.dp)){Column(Modifier.padding(14.dp)){Text(item.title,fontWeight=FontWeight.Bold);Text(item.detail,color=Color.Gray);Button(onClick={scope.launch{joinCommunity(item.id)}},modifier=Modifier.padding(top=6.dp)){Text("Join")}}} }
                    }'''
new_c = '''                    "Communities" -> LazyColumn(Modifier.fillMaxSize().padding(16.dp)) {
                        item {
                            Text("Communities",fontSize=20.sp,fontWeight=FontWeight.Bold,color=Ink)
                            CommunityCreateForm(
                                name = communityName,
                                onName = { communityName = it },
                                description = communityDesc,
                                onDescription = { communityDesc = it },
                                enabled = !busy,
                                onCreate = { scope.launch { createCommunity() } }
                            )
                            Text("Discover", fontWeight=FontWeight.Bold, color=Ink, modifier=Modifier.padding(top=8.dp, bottom=6.dp))
                        }
                        items(communities){ item -> Card(Modifier.fillMaxWidth().padding(vertical=6.dp), colors=CardDefaults.cardColors(containerColor=Color(0xFF15151D))){Column(Modifier.padding(14.dp)){Text(item.title,fontWeight=FontWeight.Bold,color=Ink);Text(item.detail,color=Color.Gray);Button(onClick={scope.launch{joinCommunity(item.id)}},modifier=Modifier.padding(top=6.dp)){Text("Join")}}} }
                    }'''
if old_c in t:
    t = t.replace(old_c, new_c)
    print("communities patched")
else:
    print("WARN: communities block not found")

p.write_text(t)
print("wrote", p, "size", len(t))
