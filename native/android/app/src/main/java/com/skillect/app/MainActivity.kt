package com.skillect.app

import android.os.Bundle
import android.net.Uri
import android.content.Context
import android.content.Intent
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import java.util.UUID
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
import java.net.URLEncoder

private val Blue = Color(0xFF00C878)
private val Ink = Color(0xFFF2F2F2)
private val SkillectBlack = Color(0xFF050509)
private val MutedNav = Color(0xFF77748C)
private val client = OkHttpClient()
private const val URL = BuildConfig.SUPABASE_URL
private const val KEY = BuildConfig.SUPABASE_KEY

data class Post(val id: String, val authorId: String, val body: String, val author: String, val handle: String, val image: String?, val likes: Int, val comments: Int)
data class SimpleItem(val id: String, val title: String, val detail: String)

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val prefs = getSharedPreferences("skillect-session", MODE_PRIVATE)
        setContent {
            MaterialTheme(colorScheme = darkColorScheme(primary = Blue, background = SkillectBlack, surface = SkillectBlack)) {
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
    var displayNameInput by remember { mutableStateOf("") }
    var usernameInput by remember { mutableStateOf("") }
    var authMode by remember { mutableStateOf("Sign in") }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var posts by remember { mutableStateOf<List<Post>>(emptyList()) }
    var likedIds by remember { mutableStateOf<Set<String>>(emptySet()) }
    var savedIds by remember { mutableStateOf<Set<String>>(emptySet()) }
    var tab by remember { mutableStateOf("Feed") }
    var refresh by remember { mutableIntStateOf(0) }
    var createText by remember { mutableStateOf("") }
    var selectedMediaUri by remember { mutableStateOf<Uri?>(null) }
    var selectedMediaName by remember { mutableStateOf<String?>(null) }
    val context = androidx.compose.ui.platform.LocalContext.current
    val mediaPicker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri -> selectedMediaUri = uri; selectedMediaName = uri?.lastPathSegment }
    var searchText by remember { mutableStateOf("") }
    var results by remember { mutableStateOf<List<SimpleItem>>(emptyList()) }
    var followingIds by remember { mutableStateOf<Set<String>>(emptySet()) }
    var projects by remember { mutableStateOf<List<SimpleItem>>(emptyList()) }
    var communities by remember { mutableStateOf<List<SimpleItem>>(emptyList()) }
    var joinedCommunityIds by remember { mutableStateOf<Set<String>>(emptySet()) }
    var displayName by remember { mutableStateOf("") }
    var username by remember { mutableStateOf("") }
    var bio by remember { mutableStateOf("") }
    var projectTitle by remember { mutableStateOf("") }
    var projectDescription by remember { mutableStateOf("") }
    var notifications by remember { mutableStateOf<List<SimpleItem>>(emptyList()) }
    var showCommentsFor by remember { mutableStateOf<String?>(null) }
    var comments by remember { mutableStateOf<List<SimpleItem>>(emptyList()) }
    var commentText by remember { mutableStateOf("") }
    val scope = rememberCoroutineScope()

    suspend fun loadUser() {
        val active = token ?: return
        try {
            val u = api("GET", "/auth/v1/user", active)
            userId = u.optString("id").takeIf { it.isNotBlank() }
            val id = userId ?: return
            val arr = apiArray("/rest/v1/profiles?select=display_name,username,bio&id=eq.$id&limit=1", active)
            if (arr.length() > 0) {
                val p = arr.getJSONObject(0)
                displayName = p.optString("display_name")
                username = p.optString("username")
                bio = p.optString("bio")
            }
        } catch (e: Exception) { error = e.message }
    }

    suspend fun loadFeed() {
        val active = token ?: return
        try {
            val arr = apiArray("/rest/v1/posts?select=id,author_id,content,image_url,likes_count,comments_count,profiles(display_name,username)&order=created_at.desc&limit=50", active)
            posts = (0 until arr.length()).map { i ->
                val p = arr.getJSONObject(i); val profile = p.optJSONObject("profiles") ?: JSONObject()
                Post(p.optString("id"), p.optString("author_id"), p.optString("content"), profile.optString("display_name", "Skillect member"), profile.optString("username", "member"), p.optString("image_url").takeIf { it.isNotBlank() }, p.optInt("likes_count"), p.optInt("comments_count"))
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
        val active = token ?: return
        try {
            val arr = apiArray("/rest/v1/projects?select=id,title,description,status&order=created_at.desc&limit=40", active)
            projects = (0 until arr.length()).map { val p=arr.getJSONObject(it); SimpleItem(p.optString("id"),p.optString("title"),p.optString("description")) }
        } catch (e: Exception) { error=e.message }
    }

    suspend fun loadCommunities() {
        val active = token ?: return
        try {
            val arr = apiArray("/rest/v1/communities?select=id,name,description,member_count&order=created_at.desc&limit=40", active)
            communities = (0 until arr.length()).map { val p=arr.getJSONObject(it); SimpleItem(p.optString("id"),p.optString("name"),p.optString("description")) }
            val me=userId
            if(me!=null) {
                val joined=apiArray("/rest/v1/community_members?select=community_id&user_id=eq.$me",active)
                joinedCommunityIds=(0 until joined.length()).map { joined.getJSONObject(it).optString("community_id") }.toSet()
            }
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
            if(joinedCommunityIds.contains(id)) return
            api("POST", "/rest/v1/community_members", active, JSONObject().put("community_id", id).put("user_id", me))
            joinedCommunityIds=joinedCommunityIds+id
            error = null
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

    suspend fun blockUser(targetId:String) {
        val active=token ?: return
        val me=userId ?: return
        if(targetId==me) return
        try {
            api("POST","/rest/v1/blocks",active,JSONObject().put("blocker_id",me).put("blocked_id",targetId))
            results=results.filterNot{it.id==targetId}
        } catch(e:Exception){ error=e.message }
    }

    suspend fun searchPeople() {
        val active=token ?: return
        if (searchText.isBlank()) { results=emptyList(); return }
        try {
            val q=URLEncoder.encode(searchText.trim(), "UTF-8")
            val arr=apiArray("/rest/v1/profiles?select=id,display_name,username,bio&or=(username.ilike.%25$q%25,display_name.ilike.%25$q%25)&limit=30",active)
            results=(0 until arr.length()).map { val p=arr.getJSONObject(it); SimpleItem(p.optString("id"),p.optString("display_name")+"  @"+p.optString("username"),p.optString("bio")) }
            val me=userId
            if(me!=null) {
                val following=apiArray("/rest/v1/follows?select=following_id&follower_id=eq.$me",active)
                followingIds=(0 until following.length()).map { following.getJSONObject(it).optString("following_id") }.toSet()
            }
        } catch(e:Exception){ error=e.message }
    }

    suspend fun toggleFollow(targetId:String) {
        val active=token ?: return
        val me=userId ?: return
        if(targetId==me) return
        try {
            if(followingIds.contains(targetId)) {
                api("DELETE","/rest/v1/follows?follower_id=eq.$me&following_id=eq.$targetId",active)
                followingIds=followingIds-targetId
            } else {
                api("POST","/rest/v1/follows",active,JSONObject().put("follower_id",me).put("following_id",targetId))
                followingIds=followingIds+targetId
            }
        } catch(e:Exception){ error=e.message }
    }

    LaunchedEffect(token, refresh) {
        if (token != null) {
            loadUser()
            loadFeed()
            loadProjects()
            loadCommunities()
        }
    }

    suspend fun createPost() {
        val active=token ?: return
        val author=userId ?: return
        if(createText.isBlank()) return
        busy=true
        try {
            val mediaUrl = selectedMediaUri?.let { uploadPostMedia(context,it,active,author) }
            val body=JSONObject().put("author_id",author).put("content",createText.trim()).put("tags",JSONArray())
            if(mediaUrl!=null) body.put("image_url",mediaUrl)
            api("POST","/rest/v1/posts",active,body)
            createText=""
            selectedMediaUri=null
            selectedMediaName=null
            tab="Feed"
            loadFeed()
            error=null
        } catch(e:Exception){ error=e.message }
        busy=false
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
        val active=token ?: return
        try {
            val arr=apiArray("/rest/v1/comments?select=id,content,profiles(display_name)&post_id=eq.$postId&order=created_at.asc&limit=100",active)
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

    if (token == null) {
        Column(Modifier.fillMaxSize().background(SkillectBlack).padding(horizontal=28.dp), verticalArrangement=Arrangement.Center) {
            Text("Skillect", color=Blue, fontSize=34.sp, fontWeight=FontWeight.ExtraBold)
            Text("Grow skills. Share progress. Build together.", color=Ink, modifier=Modifier.padding(top=6.dp,bottom=28.dp))
            if (authMode == "Sign up") {
                OutlinedTextField(displayNameInput,{displayNameInput=it},label={Text("Your name")},modifier=Modifier.fillMaxWidth(),singleLine=true)
                Spacer(Modifier.height(10.dp))
                OutlinedTextField(usernameInput,{usernameInput=it.lowercase().filter { ch -> ch.isLetterOrDigit() || ch == '_' }},label={Text("Username")},modifier=Modifier.fillMaxWidth(),singleLine=true)
                Spacer(Modifier.height(10.dp))
            }
            OutlinedTextField(email,{email=it},label={Text("Email")},modifier=Modifier.fillMaxWidth(),singleLine=true)
            Spacer(Modifier.height(12.dp))
            if (authMode != "Reset password") {
                OutlinedTextField(password,{password=it},label={Text("Password")},visualTransformation=PasswordVisualTransformation(),modifier=Modifier.fillMaxWidth(),singleLine=true)
            }
            error?.let { Text(it,color=Color.Red,modifier=Modifier.padding(top=10.dp)) }
            Button(onClick={
                scope.launch {
                    busy=true; error=null
                    try {
                        when(authMode) {
                            "Sign in" -> {
                                val auth=api("POST","/auth/v1/token?grant_type=password",null,JSONObject().put("email",email.trim()).put("password",password))
                                val newToken=auth.getString("access_token"); token=newToken; onToken(newToken)
                            }
                            "Sign up" -> {
                                require(displayNameInput.isNotBlank() && usernameInput.length >= 3) { "Enter your name and a username of at least 3 characters." }
                                val metadata=JSONObject().put("display_name",displayNameInput.trim()).put("username",usernameInput.trim())
                                val auth=api("POST","/auth/v1/signup",null,JSONObject().put("email",email.trim()).put("password",password).put("data",metadata))
                                val newToken=auth.optString("access_token")
                                if(newToken.isNotBlank()) { token=newToken; onToken(newToken) }
                                else error="Account created. Check your email if confirmation is enabled, then sign in."
                            }
                            else -> {
                                api("POST","/auth/v1/recover",null,JSONObject().put("email",email.trim()))
                                error="If an account exists for this email, password reset instructions have been sent."
                            }
                        }
                    } catch(e:Exception){ error=e.message ?: "$authMode failed" }
                    busy=false
                }
            },enabled=!busy && email.contains("@") && (authMode=="Reset password" || password.length>=8),modifier=Modifier.fillMaxWidth().padding(top=20.dp),shape=RoundedCornerShape(14.dp)) { Text(if(busy) "Please wait…" else authMode) }
            if (authMode == "Sign in") TextButton(onClick={authMode="Reset password";error=null}) { Text("Forgot password?") }
            TextButton(onClick={authMode=if(authMode=="Sign up") "Sign in" else "Sign up";error=null}) { Text(if(authMode=="Sign up") "Already have an account? Sign in" else "New to Skillect? Create account") }
        }
    } else {
        Scaffold(
            topBar={ Row(Modifier.fillMaxWidth().height(72.dp).background(SkillectBlack).padding(horizontal=22.dp),verticalAlignment=Alignment.CenterVertically) {
                Box(Modifier.size(42.dp).background(Color(0xFF101018),RoundedCornerShape(12.dp)),contentAlignment=Alignment.Center) {
                    Text("s",color=Blue,fontSize=34.sp,fontWeight=FontWeight.Bold)
                }
                Text("Skillect",color=Blue,fontWeight=FontWeight.ExtraBold,fontSize=25.sp,modifier=Modifier.padding(start=14.dp))
            }},
            bottomBar={
                NavigationBar(containerColor=SkillectBlack,contentColor=MutedNav,tonalElevation=0.dp) {
                    listOf("Feed","Explore","Communities","Create","Messages","Profile").forEach { item ->
                        NavigationBarItem(
                            selected=tab==item,
                            onClick={
                                tab=item
                                if(item=="Communities") scope.launch { loadCommunities() }
                            },
                            icon={Text(when(item){"Feed"->"⌂";"Explore"->"◈";"Communities"->"♧";"Create"->"⊞";"Messages"->"○";else->"♙"},fontSize=25.sp)},
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
                    "Feed" -> {
                        Row(Modifier.fillMaxWidth().padding(horizontal=16.dp,vertical=10.dp),horizontalArrangement=Arrangement.SpaceBetween) {
                            Text("Your learning feed",fontSize=20.sp,fontWeight=FontWeight.Bold,color=Ink)
                            TextButton(onClick={scope.launch{loadFeed()}}){Text("Refresh")}
                        }
                        if(posts.isEmpty()) Spacer(Modifier.fillMaxSize())
                        else LazyColumn(contentPadding=PaddingValues(14.dp),verticalArrangement=Arrangement.spacedBy(12.dp)) {
                            items(posts,key={it.id}) { post ->
                                Card(colors=CardDefaults.cardColors(containerColor=Color.White),shape=RoundedCornerShape(18.dp),modifier=Modifier.fillMaxWidth()) {
                                    Column(Modifier.padding(18.dp)) {
                                        Text(post.author,fontWeight=FontWeight.Bold,color=Ink)
                                        Text("@${post.handle}",color=Color.Gray,fontSize=12.sp)
                                        Text(post.body,color=Ink,modifier=Modifier.padding(top=12.dp),lineHeight=22.sp)
                                        post.image?.let { mediaUrl -> TextButton(onClick={context.startActivity(Intent(Intent.ACTION_VIEW,Uri.parse(mediaUrl)))},modifier=Modifier.padding(top=4.dp)){Text("Open attached image",color=Blue,fontSize=12.sp)} }
                                        Row(Modifier.fillMaxWidth().padding(top=10.dp),horizontalArrangement=Arrangement.SpaceBetween) {
                                            TextButton(onClick={scope.launch{toggleLike(post)}}){Text((if(likedIds.contains(post.id)) "♥ " else "♡ ")+post.likes)}
                                            TextButton(onClick={scope.launch{showCommentsFor=post.id;loadComments(post.id)}}){Text("Comments ${post.comments}")}
                                            TextButton(onClick={scope.launch{toggleSave(post)}}){Text(if(savedIds.contains(post.id)) "Saved" else "Save")}
                                            TextButton(onClick={scope.launch{reportPost(post)}}){Text("Report")}
                                        }
                                    }
                                }
                            }
                        }
                    }
                    "Explore" -> Column(Modifier.fillMaxSize().padding(16.dp)) {
                        Text("Find your people",fontSize=20.sp,fontWeight=FontWeight.Bold,color=Ink)
                        OutlinedTextField(searchText,{searchText=it},label={Text("Search by name or username")},modifier=Modifier.fillMaxWidth())
                        Button(onClick={scope.launch{searchPeople()}},modifier=Modifier.padding(top=8.dp)){Text("Search")}
                        LazyColumn { items(results){ item -> Card(Modifier.fillMaxWidth().padding(vertical=5.dp)){Column(Modifier.padding(14.dp)){Text(item.title,fontWeight=FontWeight.Bold);Text(item.detail,color=Color.Gray);Row { TextButton(onClick={scope.launch{toggleFollow(item.id)}}){Text(if(followingIds.contains(item.id)) "Following" else "Follow")};TextButton(onClick={scope.launch{blockUser(item.id)}}){Text("Block")} }}} } }
                    }
                    "Create" -> Column(Modifier.fillMaxSize().padding(16.dp)) {
                        Text("Share your progress",fontSize=20.sp,fontWeight=FontWeight.Bold,color=Ink)
                        OutlinedTextField(createText,{createText=it},label={Text("What are you learning or building?")},modifier=Modifier.fillMaxWidth().heightIn(min=150.dp),maxLines=8)
                        Row(verticalAlignment=Alignment.CenterVertically) {
                            TextButton(onClick={mediaPicker.launch("image/*")},enabled=!busy){Text("Choose image")}
                            selectedMediaName?.let { Text(it.takeLast(28),color=Color.Gray,fontSize=12.sp) }
                            if(selectedMediaUri!=null) TextButton(onClick={selectedMediaUri=null;selectedMediaName=null}){Text("Remove")}
                        }
                        Button(onClick={scope.launch{createPost()}},enabled=(createText.isNotBlank()||selectedMediaUri!=null)&&!busy,modifier=Modifier.padding(top=12.dp)){Text(if(busy)"Publishing…" else "Publish post")}
                    }
                    "Projects" -> Column(Modifier.fillMaxSize().padding(16.dp)) {
                        Text("Projects & builds",fontSize=20.sp,fontWeight=FontWeight.Bold,color=Ink)
                        OutlinedTextField(projectTitle,{projectTitle=it},label={Text("Project title")},modifier=Modifier.fillMaxWidth())
                        OutlinedTextField(projectDescription,{projectDescription=it},label={Text("What are you building?")},modifier=Modifier.fillMaxWidth(),maxLines=4)
                        Button(onClick={scope.launch{createProject()}},enabled=projectTitle.isNotBlank()&&projectDescription.isNotBlank()){Text("Add project")}
                        LazyColumn { items(projects){ item -> Card(Modifier.fillMaxWidth().padding(vertical=6.dp)){Column(Modifier.padding(14.dp)){Text(item.title,fontWeight=FontWeight.Bold);Text(item.detail,color=Color.Gray)}} } }
                        TextButton(onClick={scope.launch{loadCommunities();tab="Communities"}}){Text("Explore communities")}
                    }
                    "Profile" -> Column(Modifier.fillMaxSize().padding(20.dp)) {
                        Text(displayName.ifBlank{"Your profile"},fontSize=25.sp,fontWeight=FontWeight.Bold,color=Ink)
                        Text("@$username",color=Color.Gray)
                        OutlinedTextField(displayName,{displayName=it},label={Text("Display name")},modifier=Modifier.fillMaxWidth())
                        OutlinedTextField(bio,{bio=it},label={Text("Bio")},modifier=Modifier.fillMaxWidth(),maxLines=4)
                        Button(onClick={scope.launch{updateProfile()}}){Text("Save profile")}
                        Text("Posts: ${posts.count{it.authorId==userId}}",modifier=Modifier.padding(top=14.dp))
                        TextButton(onClick={scope.launch{loadFeed()}}){Text("Refresh profile")}
                    }
                    "Messages" -> Spacer(Modifier.fillMaxSize())
                    "Communities" -> LazyColumn(Modifier.fillMaxSize().padding(16.dp)) {
                        item { Text("Communities",fontSize=20.sp,fontWeight=FontWeight.Bold,color=Ink) }
                        items(communities){ item -> Card(Modifier.fillMaxWidth().padding(vertical=6.dp)){Column(Modifier.padding(14.dp)){Text(item.title,fontWeight=FontWeight.Bold);Text(item.detail,color=Color.Gray);Button(onClick={scope.launch{joinCommunity(item.id)}},enabled=!joinedCommunityIds.contains(item.id),modifier=Modifier.padding(top=6.dp)){Text(if(joinedCommunityIds.contains(item.id)) "Joined" else "Join")}}} }
                    }
                    "Notifications" -> LazyColumn(Modifier.fillMaxSize().padding(16.dp)) {
                        item { Text("Notifications",fontSize=20.sp,fontWeight=FontWeight.Bold,color=Ink) }
                        item { TextButton(onClick={scope.launch{loadNotifications()}}){Text("Refresh")} }
                        items(notifications){ item -> Card(Modifier.fillMaxWidth().padding(vertical=5.dp)){Column(Modifier.padding(14.dp)){Text(item.title,fontWeight=FontWeight.Bold);Text(item.detail,color=Color.Gray);TextButton(onClick={scope.launch{markNotificationRead(item.id)}}){Text("Mark read")}}} }
                    }
                }
            }
        }
    }

    showCommentsFor?.let { postId ->
        AlertDialog(
            onDismissRequest={showCommentsFor=null},
            title={Text("Comments")},
            text={
                Column {
                    LazyColumn(Modifier.heightIn(max=280.dp)) {
                        items(comments){ c -> Column(Modifier.padding(vertical=5.dp)){Text(c.title,fontWeight=FontWeight.Bold);Text(c.detail)} }
                    }
                    OutlinedTextField(commentText,{commentText=it},label={Text("Write a comment")},modifier=Modifier.fillMaxWidth())
                }
            },
            confirmButton={TextButton(onClick={scope.launch{addComment(postId)}}){Text("Send")}},
            dismissButton={TextButton(onClick={showCommentsFor=null}){Text("Close")}}
        )
    }
}


private suspend fun uploadPostMedia(context:Context, uri:Uri, token:String, userId:String):String = withContext(Dispatchers.IO) {
    val mime=context.contentResolver.getType(uri) ?: "image/jpeg"
    require(mime.startsWith("image/")) { "Choose an image file" }
    val bytes=context.contentResolver.openInputStream(uri)?.use { it.readBytes() } ?: error("Could not read selected image")
    require(bytes.size <= 12 * 1024 * 1024) { "Image must be 12 MB or smaller" }
    val ext=when(mime.substringAfter("/")) { "jpeg" -> "jpg"; "svg+xml" -> "svg"; else -> mime.substringAfter("/") }
    val path="$userId/${UUID.randomUUID()}.$ext"
    val request=Request.Builder()
        .url("$URL/storage/v1/object/post-media/$path")
        .addHeader("apikey",KEY)
        .addHeader("Authorization","Bearer $token")
        .addHeader("Content-Type",mime)
        .addHeader("x-upsert","false")
        .post(bytes.toRequestBody(mime.toMediaType()))
        .build()
    client.newCall(request).execute().use { response ->
        val text=response.body?.string().orEmpty()
        if(!response.isSuccessful) throw IllegalStateException("Image upload failed (${response.code}): $text")
    }
    "$URL/storage/v1/object/public/post-media/$path"
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

private suspend fun apiArray(path:String,token:String):JSONArray = withContext(Dispatchers.IO) {
    val request=Request.Builder().url(URL+path).addHeader("apikey",KEY).addHeader("Authorization","Bearer $token").build()
    client.newCall(request).execute().use { response ->
        val text=response.body?.string().orEmpty()
        if(!response.isSuccessful) throw IllegalStateException("Request failed (${response.code}): $text")
        JSONArray(text)
    }
}
