#!/usr/bin/env python3
"""Add Settings tab, notifications in nav, privacy, blocked list, leave community."""
from pathlib import Path
import sys

p = Path(sys.argv[1] if len(sys.argv) > 1 else "native/android/app/src/main/java/com/skillect/app/MainActivity.kt")
t = p.read_text()
if "SettingsScreen(" in t and "loadBlocked" in t:
    print("slices already applied")
    sys.exit(0)

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
    t = t.replace("    suspend fun updateProfile() {", insert + "    suspend fun updateProfile() {")

# nav tabs include Settings + Notifications
old_tabs = 'listOf("Feed","Explore","Communities","Create","Messages","Profile")'
new_tabs = 'listOf("Feed","Explore","Communities","Create","Messages","Notifications","Settings","Profile")'
if old_tabs in t:
    t = t.replace(old_tabs, new_tabs)

# icon when
old_icons = 'when(item){"Feed"->"⌂";"Explore"->"◈";"Communities"->"♧";"Create"->"⊞";"Messages"->"○";else->"♙"}'
new_icons = 'when(item){"Feed"->"⌂";"Explore"->"◈";"Communities"->"♧";"Create"->"⊞";"Messages"->"○";"Notifications"->"◉";"Settings"->"⚙";else->"♙"}'
if old_icons in t:
    t = t.replace(old_icons, new_icons)

# onClick load notifications
t = t.replace(
    'if(item=="Communities") scope.launch { loadCommunities() }',
    '''if(item=="Communities") scope.launch { loadCommunities() }
                                if(item=="Notifications") scope.launch { loadNotifications() }
                                if(item=="Settings") scope.launch { loadBlocked() }''',
)

# Communities leave button
if 'leaveCommunity(item.id)' not in t:
    t = t.replace(
        'Button(onClick={scope.launch{joinCommunity(item.id)}},modifier=Modifier.padding(top=6.dp)){Text("Join")}',
        '''Row(horizontalArrangement=Arrangement.spacedBy(8.dp), modifier=Modifier.padding(top=6.dp)) {
                                Button(onClick={scope.launch{joinCommunity(item.id)}}){Text("Join")}
                                OutlinedButton(onClick={scope.launch{leaveCommunity(item.id)}}){Text("Leave")}
                            }''',
    )

# Settings tab branch before Notifications or after Profile
if '"Settings" ->' not in t:
    settings_branch = '''
                    "Settings" -> SettingsScreen(
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
    # insert before Notifications branch if present
    if '"Notifications" ->' in t:
        t = t.replace('"Notifications" ->', settings_branch + '                    "Notifications" ->')
    else:
        t = t.replace('"Profile" ->', settings_branch + '                    "Profile" ->')

p.write_text(t)
print("slices applied", len(t), "braces", t.count("{"), t.count("}"))
