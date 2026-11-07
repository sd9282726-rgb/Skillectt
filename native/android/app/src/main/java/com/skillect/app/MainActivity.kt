package com.skillect.app

import android.os.Bundle
import android.net.Uri
import android.widget.VideoView
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.ui.viewinterop.AndroidView
import coil.compose.AsyncImage
import androidx.compose.foundation.background
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
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
import java.net.URLEncoder

private val Blue = Color(0xFF72B7FF)
private val Navy = Color(0xFF07172B)
private val NavySurface = Color(0xFF10243D)
private val NavyRaised = Color(0xFF17314F)
private val NavyLine = Color(0xFF294766)
private val Ink = Color(0xFFE8EEF8)
private val SkillectBlack = Navy
private val MutedNav = Color(0xFF94A3B8)
private val client = OkHttpClient()
private const val URL = BuildConfig.SUPABASE_URL
private const val KEY = BuildConfig.SUPABASE_KEY

data class Post(val id: String, val authorId: String, val body: String, val author: String, val handle: String, val image: String?, val mediaUrl: String?, val mediaType: String, val likes: Int, val comments: Int)
data class SimpleItem(val id: String, val title: String, val detail: String)

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val prefs = getSharedPreferences("skillect-session", MODE_PRIVATE)
        setContent {
            MaterialTheme(colorScheme = darkColorScheme(primary = Blue, secondary = Color(0xFF8BC8FF), background = SkillectBlack, surface = NavySurface, surfaceVariant = NavyRaised, outline = NavyLine)) {
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
    var userId by remember { mutableStateOf<String?>(null) }
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var onboarded by remember { mutableStateOf(true) }
    var dateOfBirth by remember { mutableStateOf("") }
    var communityName by remember { mutableStateOf("") }
    var communityDesc by remember { mutableStateOf("") }
    var isPrivate by remember { mutableStateOf(false) }
    var blockedUsers by remember { mutableStateOf<List<SimpleItem>>(emptyList()) }
    var selectedCommunityId by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var posts by remember { mutableStateOf<List<Post>>(emptyList()) }
    var likedIds by remember { mutableStateOf<Set<String>>(emptySet()) }
    var savedIds by remember { mutableStateOf<Set<String>>(emptySet()) }
    var tab by remember { mutableStateOf("Home") }
    var refresh by remember { mutableIntStateOf(0) }
    var createText by remember { mutableStateOf("") }
    var searchText by remember { mutableStateOf("") }
    var results by remember { mutableStateOf<List<SimpleItem>>(emptyList()) }
    var selectedPerson by remember { mutableStateOf<SimpleItem?>(null) }
    var selectedPersonPosts by remember { mutableStateOf<List<Post>>(emptyList()) }
    var projects by remember { mutableStateOf<List<SimpleItem>>(emptyList()) }
    var communities by remember { mutableStateOf<List<SimpleItem>>(emptyList()) }
    var displayName by remember { mutableStateOf("") }
    var username by remember { mutableStateOf("") }
    var bio by remember { mutableStateOf("") }
    var projectTitle by remember { mutableStateOf("") }
    var projectDescription by remember { mutableStateOf("") }
    var notifications by remember { mutableStateOf<List<SimpleItem>>(emptyList()) }
    var showCommentsFor by remember { mutableStateOf<String?>(null) }
    var comments by remember { mutableStateOf<List<SimpleItem>>(emptyList()) }
    var commentText by remember { mutableStateOf("") }
    var showAuthPrompt by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    fun requireAccount(): Boolean {
        if (token == null) { showAuthPrompt = true; return false }
        return true
    }

    suspend fun loadUser() {
        val active = token ?: return
        try {
            val u = api("GET", "/auth/v1/user", active)
            userId = u.optString("id").takeIf { it.isNotBlank() }
            val id = userId ?: return
            val arr = apiArray("/rest/v1/profiles?select=display_name,username,bio,onboarded,date_of_birth,is_private&id=eq.$id&limit=1", active)
            if (arr.length() > 0) {
                val p = arr.getJSONObject(0)
                displayName = p.optString("display_name")
                username = p.optString("username")
                bio = p.optString("bio")
                onboarded = p.optBoolean("onboarded", true)
                if (!onboarded) tab = "Profile"
                isPrivate = p.optBoolean("is_private", false)
                if (!p.isNull("date_of_birth")) dateOfBirth = p.optString("date_of_birth")
            } else {
                onboarded = false
                tab = "Profile"
            }
        } catch (e: Exception) { error = e.message }
    }

    suspend fun loadFeed() {
        try {
            val arr = apiArray("/rest/v1/posts?select=id,author_id,content,image_url,media_type,likes_count,comments_count,profiles(display_name,username),media_assets(public_url,media_type,status)&moderation_hidden=eq.false&order=created_at.desc&limit=50", token)
            posts = (0 until arr.length()).map { i ->
                val p = arr.getJSONObject(i); val profile = p.optJSONObject("profiles") ?: JSONObject()
                Post(p.optString("id"), p.optString("author_id"), p.optString("content"), profile.optString("display_name", "Skillect member"), profile.optString("username", "member"), p.optString("image_url").takeIf { it.isNotBlank() }, p.optJSONArray("media_assets")?.let { assets -> (0 until assets.length()).map { assets.getJSONObject(it) }.firstOrNull { it.optString("status") == "approved" }?.optString("public_url")?.takeIf { it.isNotBlank() } }, p.optString("media_type", "text"), p.optInt("likes_count"), p.optInt("comments_count"))
            }
            val me = userId
            if (me != null) {
                val likes = apiArray("/rest/v1/post_likes?select=post_id&user_id=eq.$me", active)
                likedIds = (0 until likes.length()).map { likes.getJSONObject(it).optString("post_id") }.toSet()
                val saves = apiArray("/rest/v1/saved_posts?select=post_id&user_id=eq.$me", active)
                savedIds = (0 until saves.length()).map { saves.getJSONObject(it).optString("post_id") }.toSet()
            }
        } catch (e: Exception) { error = e.message ?: "Could not load feed" }
    }

    suspend fun loadProjects() {
        try {
            val arr = apiArray("/rest/v1/projects?select=id,title,description,status&order=created_at.desc&limit=40", token)
            projects = (0 until arr.length()).map { val p=arr.getJSONObject(it); SimpleItem(p.optString("id"),p.optString("title"),p.optString("description")) }
        } catch (e: Exception) { error=e.message }
    }

    suspend fun loadCommunities() {
        try {
            val arr = apiArray("/rest/v1/communities?select=id,name,description,member_count&order=created_at.desc&limit=40", token)
            communities = (0 until arr.length()).map { val p=arr.getJSONObject(it); SimpleItem(p.optString("id"),p.optString("name"),p.optString("description")) }
        } catch (e: Exception) { error=e.message }
    }


    suspend fun createProject() {
        val active = token ?: return
        val me = userId ?: return
        if (projectTitle.isBlank() || projectDescription.isBlank()) return
        try {
            api("POST", "/rest/v1/projects", active, JSONObject().put("author_id", me).put("title", projectTitle.trim()).put("description", projectDescription.trim()).put("status", "in_progress"))
            projectTitle = ""
            projectDescription = ""
            loadProjects()
        } catch (e: Exception) { error = e.message }
    }

    suspend fun joinCommunity(id: String) {
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
        if (!isAtLeast16(dateOfBirth)) { error = "Skillect is for people aged 16 and above. Enter a valid date of birth."; return }
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
    }


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
    suspend fun updateProfile() {
        val active = token ?: return
        val me = userId ?: return
        try {
            api("PATCH", "/rest/v1/profiles?id=eq.$me", active, JSONObject().put("display_name", displayName).put("bio", bio))
            loadUser()
        } catch (e: Exception) { error = e.message }
    }

    suspend fun loadNotifications() {
        val active = token ?: return
        val me = userId ?: return
        try {
            val arr = apiArray("/rest/v1/notifications?select=id,type,message&user_id=eq.$me&order=created_at.desc&limit=50", active)
            notifications = (0 until arr.length()).map { val p = arr.getJSONObject(it); SimpleItem(p.optString("id"), p.optString("type"), p.optString("message")) }
        } catch (e: Exception) { error = e.message }
    }

    suspend fun markNotificationRead(id: String) {
        val active = token ?: return
        try {
            api("PATCH", "/rest/v1/notifications?id=eq.$id", active, JSONObject().put("read", true))
            loadNotifications()
        } catch (e: Exception) { error = e.message }
    }


    suspend fun reportPost(post: Post) {
        val active=token ?: return
        val me=userId ?: return
        try {
            api("POST","/rest/v1/reports",active,JSONObject().put("reporter_id",me).put("target_type","post").put("target_id",post.id).put("reason","inappropriate_content"))
            error="Report submitted for review"
        } catch(e:Exception){ error=e.message }
    }

    suspend fun followUser(targetId:String) {
        val active=token ?: return
        val me=userId ?: return
        if(targetId==me) return
        try {
            api("POST","/rest/v1/follows",active,JSONObject().put("follower_id",me).put("following_id",targetId))
            error = "Followed"
        } catch(e:Exception){ error=e.message }
    }

    suspend fun blockUser(targetId:String) {
        val active=token ?: return
        val me=userId ?: return
        if(targetId==me) return
        try {
            api("POST","/rest/v1/blocks",active,JSONObject().put("blocker_id",me).put("blocked_id",targetId))
            results=results.filterNot{it.id==targetId}
        } catch(e:Exception){ error=e.message }
    }

    suspend fun loadPersonPosts(personId: String) {
        try {
            val arr = apiArray("/rest/v1/posts?select=id,author_id,content,image_url,media_type,likes_count,comments_count,profiles(display_name,username),media_assets(public_url,media_type,status)&author_id=eq.$personId&moderation_hidden=eq.false&order=created_at.desc&limit=30", token)
            selectedPersonPosts = (0 until arr.length()).map { i ->
                val p = arr.getJSONObject(i); val profile = p.optJSONObject("profiles") ?: JSONObject()
                Post(p.optString("id"), p.optString("author_id"), p.optString("content"), profile.optString("display_name", "Skillect member"), profile.optString("username", "member"), p.optString("image_url").takeIf { it.isNotBlank() }, p.optJSONArray("media_assets")?.let { assets -> (0 until assets.length()).map { assets.getJSONObject(it) }.firstOrNull { it.optString("status") == "approved" }?.optString("public_url")?.takeIf { it.isNotBlank() } }, p.optString("media_type", "text"), p.optInt("likes_count"), p.optInt("comments_count"))
            }
        } catch (e: Exception) { error = e.message }
    }

    suspend fun searchPeople() {
        if (searchText.isBlank()) { results=emptyList(); return }
        try {
            val q=URLEncoder.encode(searchText.trim(), "UTF-8")
            val arr=apiArray("/rest/v1/profiles?select=id,display_name,username,bio&or=(username.ilike.%25$q%25,display_name.ilike.%25$q%25)&limit=30",token)
            results=(0 until arr.length()).map { val p=arr.getJSONObject(it); SimpleItem(p.optString("id"),p.optString("display_name")+"  @"+p.optString("username"),p.optString("bio")) }
        } catch(e:Exception){ error=e.message }
    }

    LaunchedEffect(token, refresh) {
        if (token != null) loadUser()
        loadFeed()
        loadProjects()
        loadCommunities()
    }

    suspend fun createPost() {
        val active = token ?: return
        if (createText.isBlank()) return
        busy = true
        try {
            val body = JSONObject().put("type", "post").put("content", createText.trim()).put("tags", JSONArray())
            api("POST", "/functions/v1/moderate-text", active, body)
            createText = ""
            tab = "Home"
            loadFeed()
            error = null
        } catch (e: Exception) {
            error = e.message
        }
        busy = false
    }

    suspend fun toggleLike(post:Post) {
        val active=token ?: return
        val me=userId ?: return
        try {
            if(likedIds.contains(post.id)) {
                api("DELETE","/rest/v1/post_likes?post_id=eq.${post.id}&user_id=eq.$me",active)
                likedIds=likedIds-post.id
            } else {
                api("POST","/rest/v1/post_likes",active,JSONObject().put("post_id",post.id).put("user_id",me))
                likedIds=likedIds+post.id
            }
            loadFeed()
        } catch(e:Exception){ error=e.message }
    }

    suspend fun toggleSave(post:Post) {
        val active=token ?: return
        val me=userId ?: return
        try {
            if(savedIds.contains(post.id)) {
                api("DELETE","/rest/v1/saved_posts?post_id=eq.${post.id}&user_id=eq.$me",active)
                savedIds=savedIds-post.id
            } else {
                api("POST","/rest/v1/saved_posts",active,JSONObject().put("post_id",post.id).put("user_id",me))
                savedIds=savedIds+post.id
            }
        } catch(e:Exception){ error=e.message }
    }

    suspend fun loadComments(postId:String) {
        try {
            val arr=apiArray("/rest/v1/comments?select=id,content,profiles(display_name)&post_id=eq.$postId&order=created_at.asc&limit=100",token)
            comments=(0 until arr.length()).map { val p=arr.getJSONObject(it); val profile=p.optJSONObject("profiles")?:JSONObject(); SimpleItem(p.optString("id"),profile.optString("display_name","Member"),p.optString("content")) }
        } catch(e:Exception){ error=e.message }
    }

    suspend fun addComment(postId:String) {
        val active=token ?: return
        val me=userId ?: return
        if(commentText.isBlank()) return
        try {
            api("POST","/rest/v1/comments",active,JSONObject().put("post_id",postId).put("author_id",me).put("content",commentText.trim()))
            commentText=""
            loadComments(postId)
            loadFeed()
        } catch(e:Exception){ error=e.message }
    }

    Scaffold(
            topBar={ Row(Modifier.fillMaxWidth().height(72.dp).background(SkillectBlack).padding(horizontal=22.dp),verticalAlignment=Alignment.CenterVertically) {
                Box(Modifier.size(42.dp).background(NavyRaised,RoundedCornerShape(12.dp)),contentAlignment=Alignment.Center) {
                    Text("s",color=Blue,fontSize=34.sp,fontWeight=FontWeight.Bold)
                }
                Text("Skillect",color=Ink,fontWeight=FontWeight.ExtraBold,fontSize=25.sp,modifier=Modifier.padding(start=14.dp))
                Spacer(Modifier.weight(1f))
                TextButton(onClick={ if(requireAccount()) tab="Messages" }) { Text("Inbox", color=Blue) }
                TextButton(onClick={ if(requireAccount()) { tab="Notifications"; scope.launch { loadNotifications() } } }) { Text("Alerts", color=Blue) }
            }},
            bottomBar={
                NavigationBar(containerColor=SkillectBlack,contentColor=MutedNav,tonalElevation=0.dp) {
                    listOf("Home","Explore","Communities","Create","Profile").forEach { item ->
                        NavigationBarItem(
                            selected=tab==item,
                            onClick={
                                if (item == "Create" && !requireAccount()) return@NavigationBarItem
                                tab=item
                                if(item=="Communities") scope.launch { loadCommunities() }
                            },
                            icon={Text(when(item){"Home"->"⌂";"Explore"->"⌕";"Communities"->"♧";"Create"->"＋";else->"♙"},fontSize=25.sp)},
                            label={Text(item,fontSize=10.sp)},
                            colors=NavigationBarItemDefaults.colors(selectedIconColor=Blue,selectedTextColor=Blue,unselectedIconColor=MutedNav,unselectedTextColor=MutedNav,indicatorColor=SkillectBlack)
                        )
                    }
                }
            }
        ) { padding ->
            Column(Modifier.fillMaxSize().background(SkillectBlack).padding(padding)) {
                error?.let { Text(it,color=Color.Red,modifier=Modifier.padding(horizontal=16.dp,vertical=6.dp)) }
                when(tab) {
                    "Home" -> {
                        Column(Modifier.fillMaxWidth().padding(horizontal=14.dp, vertical=8.dp)) {
                            Text("Get inspired", fontWeight=FontWeight.Bold, color=Ink, fontSize=16.sp)
                            LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(top = 8.dp)) {
                                items(listOf(
                                    Triple("Share a project", "Show what you build", "Create"),
                                    Triple("Learn in public", "Post a skill update", "Create"),
                                    Triple("Find people", "Creators like you", "Explore"),
                                    Triple("Join a club", "Communities", "Communities")
                                )) { (title, sub, go) ->
                                    Card(
                                        colors = CardDefaults.cardColors(containerColor = NavySurface),
                                        shape = RoundedCornerShape(16.dp),
                                        modifier = Modifier.width(158.dp).clickable { if (go == "Create") { if (requireAccount()) tab = go } else tab = go }
                                    ) {
                                        Column(Modifier.padding(14.dp)) {
                                            Text(title, color = Ink, fontSize = 13.sp, fontWeight = FontWeight.SemiBold, maxLines = 2)
                                            Text(sub, color = MutedNav, fontSize = 11.sp, modifier = Modifier.padding(top = 4.dp), maxLines = 2)
                                        }
                                    }
                                }
                            }
                            Row(Modifier.fillMaxWidth().padding(top=10.dp), horizontalArrangement=Arrangement.SpaceBetween, verticalAlignment=Alignment.CenterVertically) {
                                Text("For you", fontSize=18.sp, fontWeight=FontWeight.Bold, color=Ink)
                                TextButton(onClick={scope.launch{loadFeed()}}){Text("Refresh")}
                            }
                        }
                        if(posts.isEmpty()) {
                            Column(Modifier.fillMaxSize().padding(28.dp), verticalArrangement=Arrangement.Center) {
                                Text("Your feed is ready", color=Ink, fontSize=20.sp, fontWeight=FontWeight.Bold)
                                Text("Follow people, join communities, or create your first skill update.", color=Color.Gray, modifier=Modifier.padding(top=8.dp))
                                Button(onClick={if(requireAccount()) tab="Create"}, modifier=Modifier.padding(top=16.dp)){Text("Create a post")}
                            }
                        }
                        else LazyColumn(contentPadding=PaddingValues(14.dp),verticalArrangement=Arrangement.spacedBy(12.dp)) {
                            items(posts,key={it.id}) { post ->
                                Card(colors=CardDefaults.cardColors(containerColor=NavySurface),shape=RoundedCornerShape(18.dp),modifier=Modifier.fillMaxWidth()) {
                                    Column(Modifier.padding(16.dp)) {
                                        Row(verticalAlignment = Alignment.CenterVertically) {
                                            Surface(modifier = Modifier.size(42.dp), shape = CircleShape, color = NavyRaised) {
                                                Box(contentAlignment = Alignment.Center) { Text(post.author.take(1).uppercase(), color = Blue, fontWeight = FontWeight.Bold, fontSize = 17.sp) }
                                            }
                                            Column(Modifier.weight(1f).padding(start = 11.dp)) {
                                                Text(post.author,fontWeight=FontWeight.Bold,color=Ink,fontSize=14.sp)
                                                Text("@${post.handle}",color=MutedNav,fontSize=12.sp)
                                            }
                                            Text("•••", color=MutedNav, fontSize=18.sp)
                                        }
                                        Text(post.body,color=Ink,modifier=Modifier.padding(top=14.dp),lineHeight=22.sp,fontSize=15.sp)
                                        post.mediaUrl?.let { media -> if (post.mediaType == "video") { AndroidView(factory = { ctx -> VideoView(ctx).apply { setVideoURI(Uri.parse(media)); setOnPreparedListener { it.isLooping = false; start() } } }, modifier = Modifier.fillMaxWidth().height(240.dp).padding(top = 10.dp)) } else { AsyncImage(model = media, contentDescription = "Post image", modifier = Modifier.fillMaxWidth().heightIn(max = 420.dp).padding(top = 10.dp)) } } ?: post.image?.let { AsyncImage(model = it, contentDescription = "Post image", modifier = Modifier.fillMaxWidth().heightIn(max = 420.dp).padding(top = 10.dp)) }
                                        Row(Modifier.fillMaxWidth().padding(top=10.dp),horizontalArrangement=Arrangement.SpaceBetween) {
                                            TextButton(onClick={if(requireAccount()) scope.launch{toggleLike(post)}}){Text((if(likedIds.contains(post.id)) "♥ " else "♡ ")+post.likes)}
                                            TextButton(onClick={scope.launch{showCommentsFor=post.id;loadComments(post.id)}}){Text("Comments ${post.comments}")}
                                            TextButton(onClick={if(requireAccount()) scope.launch{toggleSave(post)}}){Text(if(savedIds.contains(post.id)) "Saved" else "Save")}
                                            TextButton(onClick={if(requireAccount()) scope.launch{reportPost(post)}}){Text("Report")}
                                        }
                                    }
                                }
                            }
                        }
                    }
                    "Explore" -> if (selectedPerson != null) {
                        val person = selectedPerson!!
                        Column(Modifier.fillMaxSize().padding(16.dp)) {
                            TextButton(onClick = { selectedPerson = null; selectedPersonPosts = emptyList() }) { Text("← Back to Explore") }
                            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth().padding(vertical = 12.dp)) {
                                Surface(modifier = Modifier.size(64.dp), shape = CircleShape, color = NavyRaised) {
                                    Box(contentAlignment = Alignment.Center) { Text(person.title.take(1).uppercase(), color = Blue, fontWeight = FontWeight.Bold, fontSize = 24.sp) }
                                }
                                Column(Modifier.padding(start = 14.dp).weight(1f)) {
                                    Text(person.title.substringBefore("  @"), color = Ink, fontWeight = FontWeight.Bold, fontSize = 20.sp)
                                    Text(person.title.substringAfter("  ", ""), color = MutedNav, fontSize = 13.sp)
                                }
                            }
                            Text(person.detail.ifBlank { "Building and sharing on Skillect." }, color = MutedNav, modifier = Modifier.padding(vertical = 8.dp))
                            Button(onClick = { if (requireAccount()) scope.launch { followUser(person.id) } }, modifier = Modifier.fillMaxWidth()) { Text("Follow") }
                            Text("Posts", color = Ink, fontWeight = FontWeight.Bold, fontSize = 18.sp, modifier = Modifier.padding(top = 16.dp, bottom = 8.dp))
                            if (selectedPersonPosts.isEmpty()) Text("No public posts yet", color = MutedNav)
                            else LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                                items(selectedPersonPosts, key = { it.id }) { post ->
                                    Card(colors = CardDefaults.cardColors(containerColor = NavySurface), shape = RoundedCornerShape(18.dp), modifier = Modifier.fillMaxWidth()) {
                                        Column(Modifier.padding(16.dp)) {
                                            Text(post.body, color = Ink, lineHeight = 22.sp)
                                            post.mediaUrl?.let { media -> if (post.mediaType == "video") AndroidView(factory = { ctx -> VideoView(ctx).apply { setVideoURI(Uri.parse(media)); setOnPreparedListener { it.isLooping = false; start() } } }, modifier = Modifier.fillMaxWidth().height(220.dp).padding(top = 10.dp)) else AsyncImage(model = media, contentDescription = "Post image", modifier = Modifier.fillMaxWidth().heightIn(max = 360.dp).padding(top = 10.dp)) }
                                            Text(post.likes.toString() + " likes  ·  " + post.comments + " comments", color = MutedNav, fontSize = 12.sp, modifier = Modifier.padding(top = 10.dp))
                                        }
                                    }
                                }
                            }
                        }
                    } else Column(Modifier.fillMaxSize().padding(16.dp)) {
                        Text("Discover",fontSize=24.sp,fontWeight=FontWeight.Bold,color=Ink)
                        Text("Find people who share what you love", color=MutedNav, modifier=Modifier.padding(top=4.dp, bottom=12.dp))
                        OutlinedTextField(searchText,{searchText=it},label={Text("Search by name or username")},modifier=Modifier.fillMaxWidth(),singleLine=true)
                        Button(onClick={scope.launch{searchPeople()}},modifier=Modifier.padding(top=8.dp).fillMaxWidth()){Text("Search")}
                        LazyColumn(verticalArrangement=Arrangement.spacedBy(8.dp), modifier=Modifier.padding(top=12.dp)) {
                            items(results, key = { it.id }) { item ->
                                Card(colors=CardDefaults.cardColors(containerColor=NavySurface), shape=RoundedCornerShape(16.dp), modifier=Modifier.fillMaxWidth().clickable { selectedPerson = item; scope.launch { loadPersonPosts(item.id) } }) {
                                    Row(Modifier.padding(14.dp), verticalAlignment=Alignment.CenterVertically) {
                                        Surface(modifier=Modifier.size(44.dp),shape=CircleShape,color=NavyRaised){Box(contentAlignment=Alignment.Center){Text(item.title.take(1).uppercase(),color=Blue,fontWeight=FontWeight.Bold)}}
                                        Column(Modifier.weight(1f).padding(start=12.dp)) {
                                            Text(item.title.substringBefore("  @"),fontWeight=FontWeight.Bold,color=Ink)
                                            Text(item.title.substringAfter("  ", ""),color=MutedNav,fontSize=12.sp)
                                            if(item.detail.isNotBlank()) Text(item.detail,color=MutedNav,fontSize=12.sp,maxLines=2)
                                        }
                                        Text("›", color=Blue, fontSize=24.sp)
                                    }
                                }
                            }
                        }
                    }
                    "Create" -> {
                        val activeToken = token
                        val activeUserId = userId
                        if (activeToken != null && activeUserId != null) {
                            ModeratedCreatePostScreen(activeToken, activeUserId) {
                                tab = "Home"
                                scope.launch { loadFeed() }
                            }
                        } else {
                            Column(Modifier.fillMaxWidth().padding(24.dp)) {
                                Text("Your profile unlocks posting", color=Ink, fontSize=18.sp, fontWeight=FontWeight.Bold)
                                Text("Sign in or create a profile from the Profile tab to share your work.", color=MutedNav, modifier=Modifier.padding(top=8.dp))
                                TextButton(onClick={tab="Profile"}) { Text("Go to Profile") }
                            }
                        }
                    }
                    "Projects" -> Column(Modifier.fillMaxSize().padding(16.dp)) {
                        Text("Projects & builds",fontSize=20.sp,fontWeight=FontWeight.Bold,color=Ink)
                        OutlinedTextField(projectTitle,{projectTitle=it},label={Text("Project title")},modifier=Modifier.fillMaxWidth())
                        OutlinedTextField(projectDescription,{projectDescription=it},label={Text("What are you building?")},modifier=Modifier.fillMaxWidth(),maxLines=4)
                        Button(onClick={scope.launch{createProject()}},enabled=projectTitle.isNotBlank()&&projectDescription.isNotBlank()){Text("Add project")}
                        LazyColumn { items(projects){ item -> Card(Modifier.fillMaxWidth().padding(vertical=6.dp)){Column(Modifier.padding(14.dp)){Text(item.title,fontWeight=FontWeight.Bold);Text(item.detail,color=Color.Gray)}} } }
                        TextButton(onClick={scope.launch{loadCommunities();tab="Communities"}}){Text("Explore communities")}
                    }
                    "Profile" -> if (token == null) {
                        AuthGate(
                            busy = busy, error = error, onClearError = { error = null },
                            onSignedIn = { newToken -> token = newToken; onToken(newToken); tab = "Profile"; scope.launch { loadUser() } },
                            apiPost = { path, tok, body -> api("POST", path, tok, body) }
                        )
                    } else if (!onboarded) {
                        OnboardingGate(
                            displayName = displayName, onDisplayName = { displayName = it },
                            username = username, onUsername = { username = it }, bio = bio, onBio = { bio = it },
                            dateOfBirth = dateOfBirth, onDateOfBirth = { dateOfBirth = it }, busy = busy, error = error,
                            onFinish = { scope.launch { completeOnboarding() } }
                        )
                    } else Column(Modifier.fillMaxSize().padding(20.dp).verticalScroll(rememberScrollState())) {
                        Text(displayName.ifBlank{"Your profile"},fontSize=25.sp,fontWeight=FontWeight.Bold,color=Ink)
                        Text("@$username",color=Color.Gray)
                        OutlinedTextField(displayName,{displayName=it},label={Text("Display name")},modifier=Modifier.fillMaxWidth())
                        Spacer(Modifier.height(8.dp))
                        OutlinedTextField(bio,{bio=it},label={Text("Bio")},modifier=Modifier.fillMaxWidth(),maxLines=4)
                        Button(onClick={scope.launch{updateProfile()}}, modifier=Modifier.padding(top=12.dp).fillMaxWidth()){Text("Save profile")}
                        Text("Your posts: ${posts.count{it.authorId==userId}}",modifier=Modifier.padding(top=14.dp), color=Ink)
                        Row(Modifier.fillMaxWidth(), horizontalArrangement=Arrangement.spacedBy(8.dp)) {
                            TextButton(onClick={scope.launch{loadFeed()}}){Text("Refresh feed")}
                            TextButton(onClick={scope.launch{loadNotifications(); tab="Notifications"}}){Text("Notifications")}
                            TextButton(onClick={scope.launch{loadBlocked(); tab="Settings"}}){Text("Settings")}
                        }
                        TextButton(onClick={scope.launch{loadProjects(); tab="Projects"}}){Text("Projects & builds")}
                        TextButton(onClick={scope.launch{loadCommunities(); tab="Messages"}}){Text("Messages")}
                        Spacer(Modifier.height(20.dp))
                        Text("Account", fontWeight=FontWeight.Bold, color=Ink)
                        Text("Skillect ${BuildConfig.VERSION_NAME}", color=Color.Gray, fontSize=12.sp)
                        TextButton(onClick={
                            token = null
                            userId = null
                            onSignOut()
                        }){Text("Sign out", color=Color.Red)}
                    }
                    "Messages" -> if (token != null && userId != null) MessagesScreen(token!!, userId!!) else Text("Sign in from Profile to view messages", color=Ink, modifier=Modifier.padding(20.dp))
                    "Communities" -> LazyColumn(Modifier.fillMaxSize().padding(16.dp)) {
                        item {
                            Text("Communities",fontSize=20.sp,fontWeight=FontWeight.Bold,color=Ink)
                            if (token != null) CommunityCreateForm(
                                name = communityName,
                                onName = { communityName = it },
                                description = communityDesc,
                                onDescription = { communityDesc = it },
                                enabled = !busy,
                                onCreate = { scope.launch { createCommunity() } }
                            ) else Text("Browse communities freely. Create or join one when you have a profile.", color=MutedNav, modifier=Modifier.padding(vertical=12.dp))
                            Text("Discover", fontWeight=FontWeight.Bold, color=Ink, modifier=Modifier.padding(top=8.dp, bottom=6.dp))
                        }
                        items(communities){ item -> Card(Modifier.fillMaxWidth().padding(vertical=6.dp), colors=CardDefaults.cardColors(containerColor=Color(0xFF15151D))){Column(Modifier.padding(14.dp)){Text(item.title,fontWeight=FontWeight.Bold,color=Ink);Text(item.detail,color=Color.Gray);Button(onClick={if(requireAccount()) scope.launch{joinCommunity(item.id)}},modifier=Modifier.padding(top=6.dp)){Text("Join")}}} }
                    }
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
                    "Notifications" -> LazyColumn(Modifier.fillMaxSize().padding(16.dp)) {
                        item { Text("Notifications",fontSize=20.sp,fontWeight=FontWeight.Bold,color=Ink) }
                        item { TextButton(onClick={scope.launch{loadNotifications()}}){Text("Refresh")} }
                        items(notifications){ item -> Card(Modifier.fillMaxWidth().padding(vertical=5.dp)){Column(Modifier.padding(14.dp)){Text(item.title,fontWeight=FontWeight.Bold);Text(item.detail,color=Color.Gray);TextButton(onClick={scope.launch{markNotificationRead(item.id)}}){Text("Mark read")}}} }
                    }
                }
            }
        }

    if (showAuthPrompt) AlertDialog(
        onDismissRequest = { showAuthPrompt = false },
        title = { Text("Join Skillect") },
        text = { Text("You can explore public posts and communities without an account. Create a profile or sign in to like, comment, follow, post, save, or message.") },
        confirmButton = { TextButton(onClick = { showAuthPrompt = false; tab = "Profile" }) { Text("Go to Profile") } },
        dismissButton = { TextButton(onClick = { showAuthPrompt = false }) { Text("Not now") } }
    )

    showCommentsFor?.let { postId ->
        AlertDialog(
            onDismissRequest={showCommentsFor=null},
            title={Text("Comments")},
            text={
                Column {
                    LazyColumn(Modifier.heightIn(max=280.dp)) {
                        items(comments){ c -> Column(Modifier.padding(vertical=5.dp)){Text(c.title,fontWeight=FontWeight.Bold);Text(c.detail)} }
                    }
                    if (token != null) OutlinedTextField(commentText,{commentText=it},label={Text("Write a comment")},modifier=Modifier.fillMaxWidth())
                    else Text("Sign in from Profile to join the conversation", color=MutedNav, modifier=Modifier.padding(top=10.dp))
                }
            },
            confirmButton={TextButton(onClick={if(requireAccount()) scope.launch{addComment(postId)}}){Text(if(token==null) "Sign in to comment" else "Send")}},
            dismissButton={TextButton(onClick={showCommentsFor=null}){Text("Close")}}
        )
    }
}



@Composable
private fun MessagesScreen(token: String, userId: String) {
    var conversations by remember { mutableStateOf<List<SimpleItem>>(emptyList()) }
    var activeConversation by remember { mutableStateOf<String?>(null) }
    var activeTitle by remember { mutableStateOf("") }
    var messages by remember { mutableStateOf<List<SimpleItem>>(emptyList()) }
    var messageText by remember { mutableStateOf("") }
    var newUsername by remember { mutableStateOf("") }
    var newUserId by remember { mutableStateOf<String?>(null) }
    var loading by remember { mutableStateOf(false) }
    var errorText by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    suspend fun loadInbox() {
        loading = true
        try {
            val memberships = apiArray("/rest/v1/conversation_participants?select=conversation_id&user_id=eq.$userId", token)
            val items = mutableListOf<SimpleItem>()
            for (i in 0 until memberships.length()) {
                val conversationId = memberships.getJSONObject(i).optString("conversation_id")
                if (conversationId.isBlank()) continue
                val people = apiArray("/rest/v1/conversation_participants?select=user_id,profiles(display_name,username)&conversation_id=eq.$conversationId", token)
                var title = "Conversation"
                for (j in 0 until people.length()) {
                    val person = people.getJSONObject(j)
                    if (person.optString("user_id") != userId) {
                        val profile = person.optJSONObject("profiles") ?: JSONObject()
                        title = profile.optString("display_name").ifBlank { profile.optString("username").ifBlank { "Skillect member" } }
                        break
                    }
                }
                val latest = apiArray("/rest/v1/messages?select=content&conversation_id=eq.$conversationId&order=created_at.desc&limit=1", token)
                val preview = if (latest.length() > 0) latest.getJSONObject(0).optString("content") else "Start the conversation"
                items.add(SimpleItem(conversationId, title, preview))
            }
            conversations = items
            errorText = null
        } catch (e: Exception) {
            errorText = e.message
        } finally {
            loading = false
        }
    }

    suspend fun openConversation(id: String, title: String) {
        activeConversation = id
        activeTitle = title
        try {
            val arr = apiArray("/rest/v1/messages?select=id,content,created_at,sender_id&conversation_id=eq.$id&order=created_at.asc&limit=200", token)
            messages = (0 until arr.length()).map { i ->
                val item = arr.getJSONObject(i)
                SimpleItem(item.optString("id"), if (item.optString("sender_id") == userId) "You" else title, item.optString("content"))
            }
        } catch (e: Exception) {
            errorText = e.message
        }
    }

    suspend fun sendMessage() {
        val id = activeConversation ?: return
        val body = messageText.trim()
        if (body.isEmpty()) return
        try {
            api("POST", "/rest/v1/messages", token, JSONObject().put("conversation_id", id).put("sender_id", userId).put("content", body))
            messageText = ""
            openConversation(id, activeTitle)
            loadInbox()
        } catch (e: Exception) {
            errorText = e.message
        }
    }

    suspend fun findUser() {
        if (newUsername.isBlank()) return
        try {
            val encoded = URLEncoder.encode(newUsername.trim().removePrefix("@"), "UTF-8")
            val found = apiArray("/rest/v1/profiles?select=id,display_name,username&username=ilike.$encoded&limit=1", token)
            if (found.length() == 0) {
                errorText = "No account found with that username"
                newUserId = null
            } else {
                newUserId = found.getJSONObject(0).optString("id")
                errorText = "Account found. Tap Start conversation."
            }
        } catch (e: Exception) {
            errorText = e.message
        }
    }

    suspend fun startConversation() {
        val target = newUserId ?: return
        if (target == userId) {
            errorText = "You cannot message yourself"
            return
        }
        try {
            val created = api("POST", "/rest/v1/conversations", token, JSONObject().put("created_by", userId))
            val id = created.optString("id")
            if (id.isBlank()) throw IllegalStateException("Could not create conversation")
            api("POST", "/rest/v1/conversation_participants", token, JSONObject().put("conversation_id", id).put("user_id", userId))
            api("POST", "/rest/v1/conversation_participants", token, JSONObject().put("conversation_id", id).put("user_id", target))
            newUsername = ""
            newUserId = null
            loadInbox()
            openConversation(id, "New conversation")
        } catch (e: Exception) {
            errorText = e.message
        }
    }

    LaunchedEffect(token, userId) { loadInbox() }

    Column(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            Text(if (activeConversation == null) "Messages" else activeTitle, fontSize = 22.sp, fontWeight = FontWeight.Bold, color = Ink)
            if (activeConversation != null) TextButton(onClick = { activeConversation = null; scope.launch { loadInbox() } }) { Text("Back") }
            else TextButton(onClick = { scope.launch { loadInbox() } }) { Text("Refresh") }
        }
        errorText?.let { Text(it, color = MaterialTheme.colorScheme.error, fontSize = 12.sp) }
        if (activeConversation == null) {
            OutlinedTextField(newUsername, { newUsername = it; newUserId = null }, modifier = Modifier.fillMaxWidth(), singleLine = true, label = { Text("Start a chat by username") })
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedButton(onClick = { scope.launch { findUser() } }, enabled = newUsername.isNotBlank()) { Text("Find person") }
                Button(onClick = { scope.launch { startConversation() } }, enabled = newUserId != null) { Text("Start conversation") }
            }
            if (loading) CircularProgressIndicator()
            LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                items(conversations, key = { it.id }) { item ->
                    Card(colors = CardDefaults.cardColors(containerColor = Color(0xFF15151D)), modifier = Modifier.fillMaxWidth()) {
                        Column(Modifier.fillMaxWidth().clickable { scope.launch { openConversation(item.id, item.title) } }.padding(14.dp)) {
                            Text(item.title, color = Ink, fontWeight = FontWeight.Bold)
                            Text(item.detail, color = Color.LightGray, maxLines = 1)
                        }
                    }
                }
            }
        } else {
            LazyColumn(Modifier.weight(1f).fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                items(messages, key = { it.id }) { item ->
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = if (item.title == "You") Arrangement.End else Arrangement.Start) {
                        Surface(color = if (item.title == "You") Color(0xFF1A4168) else Color(0xFF20202A), shape = RoundedCornerShape(16.dp)) {
                            Column(Modifier.widthIn(max = 280.dp).padding(12.dp)) {
                                Text(item.title, color = Blue, fontSize = 11.sp)
                                Text(item.detail, color = Ink)
                            }
                        }
                    }
                }
            }
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                OutlinedTextField(messageText, { messageText = it }, modifier = Modifier.weight(1f), placeholder = { Text("Write a message") }, maxLines = 3)
                Spacer(Modifier.width(8.dp))
                Button(onClick = { scope.launch { sendMessage() } }, enabled = messageText.isNotBlank()) { Text("Send") }
            }
        }
    }
}

private suspend fun api(method:String,path:String,token:String?,json:JSONObject?=null):JSONObject = withContext(Dispatchers.IO) {
    val builder=Request.Builder().url(URL+path).addHeader("apikey",KEY).addHeader("Content-Type","application/json")
    if(token!=null) builder.addHeader("Authorization","Bearer $token")
    val body=json?.toString()?.toRequestBody("application/json".toMediaType())
    when(method) {
        "GET" -> builder.get()
        "POST" -> builder.post(body ?: "{}".toRequestBody("application/json".toMediaType())).addHeader("Prefer","return=representation")
        "PATCH" -> builder.patch(body ?: "{}".toRequestBody("application/json".toMediaType()))
        "DELETE" -> builder.delete()
        else -> builder.get()
    }
    client.newCall(builder.build()).execute().use { response ->
        val text=response.body?.string().orEmpty()
        if(!response.isSuccessful) throw IllegalStateException(try{JSONObject(text).optString("message",JSONObject(text).optString("msg","Request failed (${response.code})"))}catch(_:Exception){"Request failed (${response.code})"})
        if(text.isBlank()) JSONObject() else try{JSONObject(text)}catch(_:Exception){JSONObject().put("data",JSONArray(text))}
    }
}

private suspend fun apiArray(path:String,token:String?):JSONArray = withContext(Dispatchers.IO) {
    val builder = Request.Builder().url(URL+path).addHeader("apikey",KEY)
    if (token != null) builder.addHeader("Authorization","Bearer $token")
    val request = builder.build()
    client.newCall(request).execute().use { response ->
        val text=response.body?.string().orEmpty()
        if(!response.isSuccessful) throw IllegalStateException("Request failed (${response.code}): $text")
        JSONArray(text)
    }
}
