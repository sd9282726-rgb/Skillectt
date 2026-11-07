#!/usr/bin/env python3
"""Add Settings tab, notifications in nav, privacy, blocked list, leave community."""
from pathlib import Path
import sys

p = Path(sys.argv[1] if len(sys.argv) > 1 else "native/android/app/src/main/java/com/skillect/app/MainActivity.kt")
t = p.read_text()
already = "SettingsScreen(" in t and "loadBlocked" in t
if already:
    print("slices features already present — still enforcing navy/nav")

# state vars
if "var isPrivate" not in t:
    t = t.replace(
        "var communityDesc by remember { mutableStateOf(\"\") }",
        '''var communityDesc by remember { mutableStateOf("") }
    var isPrivate by remember { mutableStateOf(false) }
    var blockedUsers by remember { mutableStateOf<List<SimpleItem>>(emptyList()) }
    var selectedCommunityId by remember { mutableStateOf<String?>(null) }''',
    )

# load profile is_private
t = t.replace(
    "select=display_name,username,bio,onboarded,date_of_birth",
    "select=display_name,username,bio,onboarded,date_of_birth,is_private",
)
if "isPrivate = p.optBoolean" not in t:
    t = t.replace(
        "onboarded = p.optBoolean(\"onboarded\", true)",
        '''onboarded = p.optBoolean("onboarded", true)
                isPrivate = p.optBoolean("is_private", false)''',
    )

# helper functions before updateProfile
if "suspend fun loadBlocked" not in t:
    insert = '''
    suspend fun loadBlocked() {
        val active = token ?: return
        val me = userId ?: return
        try {
            val arr = apiArray("/rest/v1/blocks?select=blocked_id,profiles:blocked_id(display_name,username)&blocker_id=eq.$me", active)
            blockedUsers = (0 until arr.length()).map { i ->
                val row = arr.getJSONObject(i)
                val prof = row.optJSONObject("profiles") ?: org.json.JSONObject()
                SimpleItem(
                    row.optString("blocked_id"),
                    prof.optString("display_name", "User"),
                    "@" + prof.optString("username", "member")
                )
            }
        } catch (e: Exception) { error = e.message }
    }

    suspend fun unblockUser(targetId: String) {
        val active = token ?: return
        val me = userId ?: return
        try {
            api("DELETE", "/rest/v1/blocks?blocker_id=eq.$me&blocked_id=eq.$targetId", active)
            loadBlocked()
        } catch (e: Exception) { error = e.message }
    }

    suspend fun setPrivateProfile(value: Boolean) {
        val active = token ?: return
        val me = userId ?: return
        try {
            api("PATCH", "/rest/v1/profiles?id=eq.$me", active, JSONObject().put("is_private", value))
            isPrivate = value
        } catch (e: Exception) { error = e.message }
    }

    suspend fun leaveCommunity(id: String) {
        val active = token ?: return
        val me = userId ?: return
        try {
            api("DELETE", "/rest/v1/community_members?community_id=eq.$id&user_id=eq.$me", active)
            loadCommunities()
            selectedCommunityId = null
        } catch (e: Exception) { error = e.message }
    }
'''
    t = t.replace("    suspend fun updateProfile()", insert + "    suspend fun updateProfile()")

# Settings branch + nav list
if "SettingsScreen(" not in t:
    settings_branch = '''                    "Settings" -> SettingsScreen(
                        isPrivate = isPrivate,
                        onTogglePrivate = { v -> scope.launch { setPrivateProfile(v) } },
                        blocked = blockedUsers,
                        onRefreshBlocked = { scope.launch { loadBlocked() } },
                        onUnblock = { id -> scope.launch { unblockUser(id) } },
                        onSignOut = {
                            token = null
                            userId = null
                            onSignOut()
                        },
                        versionName = BuildConfig.VERSION_NAME,
                    )
'''
    if '"Notifications" ->' in t:
        t = t.replace('"Notifications" ->', settings_branch + '                    "Notifications" ->')
    else:
        t = t.replace('"Profile" ->', settings_branch + '                    "Profile" ->')

if not already:
    p.write_text(t)
    print("slices applied", len(t), "braces", t.count("{"), t.count("}"))

# --- always enforce navy palette + Hercules nav order ---
import re
t = p.read_text() if already else t
t = t.replace("private val Blue = Color(0xFF00C878)", "private val Blue = Color(0xFF60A5FA)")
t = t.replace("private val Ink = Color(0xFFF2F2F2)", "private val Ink = Color(0xFFE8EEF8)")
t = t.replace("private val MutedNav = Color(0xFF77748C)", "private val MutedNav = Color(0xFF94A3B8)")
t = t.replace('var tab by remember { mutableStateOf("Feed") }', 'var tab by remember { mutableStateOf("Home") }')
t = t.replace('tab = "Feed"', 'tab = "Home"')
t = t.replace('"Feed" ->', '"Home" ->')
t = re.sub(
    r'listOf\("Feed"[^)]*\)',
    'listOf("Home","Explore","Communities","Messages","Notifications","Create","Profile","Settings")',
    t,
)
if 'listOf("Home","Explore","Communities","Messages","Notifications","Create","Profile","Settings")' not in t:
    t = re.sub(
        r'listOf\("[^"]+","Explore"[^)]*\)',
        'listOf("Home","Explore","Communities","Messages","Notifications","Create","Profile","Settings")',
        t,
        count=1,
    )
p.write_text(t)
print("navy + nav enforced, len", len(t))
