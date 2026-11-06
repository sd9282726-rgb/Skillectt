package com.skillect.app

import android.os.Bundle
import android.Manifest
import android.content.pm.PackageManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.os.Build
import com.google.firebase.FirebaseApp
import com.google.firebase.FirebaseOptions
import com.google.firebase.messaging.FirebaseMessaging
import android.net.Uri
import android.util.Base64
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
import coil.compose.AsyncImage
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
data class ChatMessage(val id:String,val senderId:String,val content:String)
data class ModerationRow(val id:String,val title:String,val detail:String,val targetId:String,val targetType:String,val reason:String)

class MainActivity : ComponentActivity() {

    private fun configureFirebase() {
        if (FirebaseApp.getApps(this).isNotEmpty()) return
        val apiKey=BuildConfig.FIREBASE_API_KEY
        val appId=BuildConfig.FIREBASE_APP_ID
        val projectId=BuildConfig.FIREBASE_PROJECT_ID
        val senderId=BuildConfig.FIREBASE_SENDER_ID
        if(apiKey.isBlank() || appId.isBlank() || projectId.isBlank() || senderId.isBlank()) return
        val options=FirebaseOptions.Builder()
            .setApiKey(apiKey).setApplicationId(appId).setProjectId(projectId).setGcmSenderId(senderId).build()
        FirebaseApp.initializeApp(this,options)
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel=NotificationChannel("skillect_activity","Skillect activity",NotificationManager.IMPORTANCE_DEFAULT)
            channel.description="Messages and account activity"
            getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        configureFirebase()
        createNotificationChannel()
        if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), 7301)
        }
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
    var isRestricted by remember { mutableStateOf(false) }
    var restrictionStatus by remember { mutableStateOf("") }
    var restrictionReason by remember { mutableStateOf("") }
    var appealStatus by remember { mutableStateOf<String?>(null) }
    var appealText by remember { mutableStateOf("") }
    var isModerator by remember { mutableStateOf(false) }
    var moderationReports by remember { mutableStateOf<List<ModerationRow>>(emptyList()) }
    var moderationAppeals by remember { mutableStateOf<List<ModerationRow>>(emptyList()) }
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
    var conversations by remember { mutableStateOf<List<SimpleItem>>(emptyList()) }
    var activeConversationId by remember { mutableStateOf<String?>(null) }
    var chatMessages by remember { mutableStateOf<List<ChatMessage>>(emptyList()) }
    var messageDraft by remember { mutableStateOf("") }
    var showCommentsFor by remember { mutableStateOf<String?>(null) }
    var comments by remember { mutableStateOf<List<SimpleItem>>(emptyList()) }
    var commentText by remember { mutableStateOf("") }
    val scope = rememberCoroutineScope()


    suspend fun loadModerationQueue() {
        val active=token ?: return
        if(!isModerator) { error="Moderator access is required."; return }
        try {
            val reports=apiArray("/rest/v1/reports?select=id,target_type,target_id,reason,details,status&status=eq.pending&order=created_at.asc&limit=100",active)
            moderationReports=(0 until reports.length()).map { i ->
                val r=reports.getJSONObject(i)
                ModerationRow(r.optString("id"),r.optString("target_type")+" · "+r.optString("reason"),r.optString("details"),r.optString("target_id"),r.optString("target_type"),r.optString("reason"))
            }
            moderationReports=moderationReports.take(25).map { row ->
                if(row.targetType=="post" || row.targetType=="comment") {
                    val table=if(row.targetType=="post") "posts" else "comments"
                    val content=apiArray("/rest/v1/"+table+"?select=content&id=eq."+row.targetId+"&limit=1",active)
                    val preview=content.optJSONObject(0)?.optString("content")
                    if(!preview.isNullOrBlank()) row.copy(detail="Reported content: "+preview) else row
                } else row
            }
            val appeals=apiArray("/rest/v1/moderation_appeals?select=id,user_id,enforcement_user_id,explanation,status&status=in.(pending,under_review)&order=created_at.asc&limit=100",active)
            moderationAppeals=(0 until appeals.length()).map { i ->
                val r=appeals.getJSONObject(i)
                ModerationRow(r.optString("id"),"Appeal · "+r.optString("status"),r.optString("explanation"),r.optString("enforcement_user_id"),"account",r.optString("user_id"))
            }
            error=null
        } catch(e:Exception) { error=e.message }
    }

    suspend fun resolveModerationReport(row:ModerationRow) {
        val active=token ?: return
        try {
            api("PATCH","/rest/v1/reports?id=eq."+row.id,active,JSONObject().put("status","resolved"))
            loadModerationQueue()
        } catch(e:Exception) { error=e.message }
    }


    suspend fun hideReportedPost(row:ModerationRow) {
        val active=token ?: return
        if(!isModerator || row.targetType!="post") return
        try {
            api("PATCH","/rest/v1/posts?id=eq."+row.targetId,active,JSONObject().put("moderation_hidden",true))
            resolveModerationReport(row)
        } catch(e:Exception) { error=e.message }
    }


    suspend fun hideReportedComment(row:ModerationRow) {
        val active=token ?: return
        if(!isModerator || row.targetType!="comment") return
        try {
            api("PATCH","/rest/v1/comments?id=eq."+row.targetId,active,JSONObject().put("moderation_hidden",true))
            resolveModerationReport(row)
        } catch(e:Exception) { error=e.message }
    }

    suspend fun banReportedAccount(row:ModerationRow) {
        val active=token ?: return
        val moderator=userId ?: return
        try {
            var target=row.targetId
            if(row.targetType=="post" || row.targetType=="comment") {
                val table=if(row.targetType=="post") "posts" else "comments"
                val content=apiArray("/rest/v1/"+table+"?select=author_id&id=eq."+row.targetId+"&limit=1",active)
                target=content.optJSONObject(0)?.optString("author_id") ?: error("Could not identify content author")
            }
            api("POST","/rest/v1/account_enforcements",active,JSONObject().put("user_id",target).put("status","permanent").put("reason","Moderator action from report: "+row.reason).put("issued_by",moderator))
            resolveModerationReport(row)
        } catch(e:Exception) { error=e.message }
    }

    suspend fun reviewModerationAppeal(row:ModerationRow, accept:Boolean) {
        val active=token ?: return
        val moderator=userId ?: return
        try {
            api("PATCH","/rest/v1/moderation_appeals?id=eq."+row.id,active,JSONObject().put("status",if(accept)"accepted" else "rejected").put("reviewed_by",moderator).put("reviewed_at",java.time.Instant.now().toString()).put("moderator_note",if(accept)"Appeal accepted by moderator" else "Appeal rejected by moderator"))
            if(accept) api("DELETE","/rest/v1/account_enforcements?user_id=eq."+row.targetId,active)
            loadModerationQueue()
        } catch(e:Exception) { error=e.message }
    }


    suspend fun submitAccountAppeal() {
        val active=token ?: return
        val me=userId ?: return
        val explanation=appealText.trim()
        if(explanation.length<20) { error="Please explain your appeal in at least 20 characters."; return }
        try {
            api("POST","/rest/v1/moderation_appeals",active,JSONObject().put("user_id",me).put("enforcement_user_id",me).put("explanation",explanation))
            appealStatus="pending"
            appealText=""
            error=null
        } catch(e:Exception) { error=e.message }
    }

    suspend fun loadUser() {
        val active = token ?: return
        try {
            val u = api("GET", "/auth/v1/user", active)
            userId = u.optString("id").takeIf { it.isNotBlank() }
            isModerator = hasModeratorRole(active)
            val id = userId ?: return
            if (FirebaseApp.getApps(context).isNotEmpty()) {
                FirebaseMessaging.getInstance().token.addOnSuccessListener { fcmToken ->
                    scope.launch {
                        try {
                            api("POST", "/rest/v1/device_tokens?on_conflict=platform,token", active,
                                JSONObject().put("user_id", id).put("platform", "android").put("token", fcmToken),
                                "resolution=merge-duplicates,return=minimal")
                        } catch (e: Exception) { error = e.message }
                    }
                }
            }
            val enforcement = apiArray("/rest/v1/account_enforcements?select=status,reason&user_id=eq.$id&limit=1", active)
            if (enforcement.length() > 0) {
                val row = enforcement.getJSONObject(0)
                isRestricted = true
                restrictionStatus = row.optString("status")
                restrictionReason = row.optString("reason", "No reason was provided.")
                val appeals = apiArray("/rest/v1/moderation_appeals?select=status&user_id=eq.$id&order=created_at.desc&limit=1", active)
                appealStatus = appeals.optJSONObject(0)?.optString("status")
                return
            } else {
                isRestricted = false
                appealStatus = null
            }
            val arr = apiArray("/rest/v1/profiles?select=display_name,username,bio&id=eq.$id&limit=1", active)
            if (arr.length() > 0) {
                val p = arr.getJSONObject(0)
                displayName = p.optString("display_name")
                username = p.optString("username")
                bio = p.optString("bio")
            }
        } catch (e: Exception) {
            isRestricted = true
            restrictionStatus = "verification_error"
            restrictionReason = "We could not verify your account status. Please try again."
            error = e.message
        }
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

    suspend fun loadConversations() {
        val active=token ?: return
        val me=userId ?: return
        try {
            val rows=apiArray("/rest/v1/conversation_participants?select=conversation_id&user_id=eq.$me",active)
            val ids=(0 until rows.length()).map{rows.getJSONObject(it).optString("conversation_id")}.filter{it.isNotBlank()}.distinct()
            conversations=ids.map{SimpleItem(it,"Conversation ${it.take(8)}","Tap to open")}
        } catch(e:Exception){ error=e.message }
    }

    suspend fun loadChatMessages(conversationId:String) {
        val active=token ?: return
        try {
            val arr=apiArray("/rest/v1/messages?select=id,sender_id,content&conversation_id=eq.$conversationId&order=created_at.asc&limit=200",active)
            chatMessages=(0 until arr.length()).map{val m=arr.getJSONObject(it);ChatMessage(m.optString("id"),m.optString("sender_id"),m.optString("content"))}
        } catch(e:Exception){ error=e.message }
    }

    suspend fun startConversation(targetId:String) {
        val active=token ?: return
        val me=userId ?: return
        if(targetId==me) return
        try {
            val created=api("POST","/rest/v1/conversations",active,JSONObject().put("created_by",me))
            val data=created.optJSONArray("data") ?: JSONArray()
            val conversationId=data.optJSONObject(0)?.optString("id") ?: error("Conversation was not created")
            api("POST","/rest/v1/conversation_participants",active,JSONObject().put("conversation_id",conversationId).put("user_id",me))
            api("POST","/rest/v1/conversation_participants",active,JSONObject().put("conversation_id",conversationId).put("user_id",targetId))
            loadConversations()
            activeConversationId=conversationId
            loadChatMessages(conversationId)
            tab="Messages"
            error=null
        } catch(e:Exception){ error=e.message }
    }

    suspend fun sendChatMessage() {
        val active=token ?: return
        val me=userId ?: return
        val conversationId=activeConversationId ?: return
        val content=messageDraft.trim()
        if(content.isEmpty()) return
        try {
            api("POST","/rest/v1/messages",active,JSONObject().put("conversation_id",conversationId).put("sender_id",me).put("content",content))
            messageDraft=""
            loadChatMessages(conversationId)
        } catch(e:Exception){ error=e.message }
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


    suspend fun reportPost(post: Post, reason:String = "inappropriate_content") {
        val active=token ?: return
        val me=userId ?: return
        try {
            api("POST","/rest/v1/reports",active,JSONObject().put("reporter_id",me).put("target_type","post").put("target_id",post.id).put("reason",reason))
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
            if (!isRestricted) {
                loadFeed()
                loadProjects()
                loadCommunities()
            }
        }
    }

    suspend fun createPost() {
        val active=token ?: return
        val author=userId ?: return
        if(createText.isBlank()) return
        if (selectedMediaUri != null) {
            error = "Photo publishing is paused until automated safety screening is connected."
            return
        }
        busy=true
        try {
            val body=JSONObject().put("author_id",author).put("content",createText.trim()).put("tags",JSONArray())
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


    suspend fun reportComment(commentId:String) {
        val active=token ?: return
        val me=userId ?: return
        try {
            api("POST","/rest/v1/reports",active,JSONObject().put("reporter_id",me).put("target_type","comment").put("target_id",commentId).put("reason","inappropriate_content"))
            error="Comment reported for moderator review."
        } catch(e:Exception) { error=e.message }
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

    if (token != null && isRestricted) {
        Column(Modifier.fillMaxSize().background(SkillectBlack).padding(24.dp),verticalArrangement=Arrangement.Center) {
            Text("Account restricted",fontSize=26.sp,fontWeight=FontWeight.Bold,color=Ink)
            Text(restrictionStatus+" · "+restrictionReason,color=Color.Gray,modifier=Modifier.padding(top=10.dp))
            if(appealStatus=="pending" || appealStatus=="under_review") {
                Text("Your appeal is "+appealStatus+". Your account remains restricted while it is reviewed.",color=Color.Yellow,modifier=Modifier.padding(top=16.dp))
            } else {
                OutlinedTextField(appealText,{appealText=it},label={Text("Explain why you believe this decision is incorrect")},modifier=Modifier.fillMaxWidth().padding(top=16.dp),minLines=5)
                Button(onClick={scope.launch{submitAccountAppeal()}},enabled=appealText.trim().length>=20,modifier=Modifier.fillMaxWidth().padding(top=12.dp)){Text("Submit appeal")}
            }
            error?.let { Text(it,color=Color.Red,modifier=Modifier.padding(top=8.dp)) }
            TextButton(onClick={token=null;userId=null;isRestricted=false;onSignOut()}){Text("Sign out")}
        }
    } else if (token == null) {
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
                    (listOf("Feed","Explore","Communities","Create","Messages","Notifications","Profile") + if(isModerator) listOf("Moderation") else emptyList()).forEach { item ->
                        NavigationBarItem(
                            selected=tab==item,
                            onClick={
                                tab=item
                                if(item=="Communities") scope.launch { loadCommunities() }; if(item=="Notifications") scope.launch { loadNotifications() }; if(item=="Moderation") scope.launch { loadModerationQueue() }
                            },
                            icon={Text(when(item){"Feed"->"⌂";"Explore"->"◈";"Communities"->"♧";"Create"->"⊞";"Messages"->"○";"Notifications"->"♧";"Moderation"->"⚑";else->"♙"},fontSize=25.sp)},
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

                    "Moderation" -> {
                        Row(Modifier.fillMaxWidth().padding(16.dp),horizontalArrangement=Arrangement.SpaceBetween) {
                            Text("Safety moderation",fontSize=20.sp,fontWeight=FontWeight.Bold,color=Ink)
                            TextButton(onClick={scope.launch{loadModerationQueue()}}){Text("Refresh")}
                        }
                        LazyColumn(Modifier.fillMaxSize(),contentPadding=PaddingValues(12.dp),verticalArrangement=Arrangement.spacedBy(10.dp)) {
                            item { Text("Pending reports",fontWeight=FontWeight.Bold,color=Ink) }
                            if(moderationReports.isEmpty()) item { Text("No pending reports",color=Color.Gray) }
                            items(moderationReports,key={"report-"+it.id}) { row ->
                                Card(Modifier.fillMaxWidth(),colors=CardDefaults.cardColors(containerColor=Color(0xFF171720))) {
                                    Column(Modifier.padding(14.dp)) {
                                        Text(row.title,fontWeight=FontWeight.Bold,color=Ink)
                                        if(row.detail.isNotBlank()) Text(row.detail,color=Color.Gray)
                                        Text("Target: "+row.targetId,fontSize=11.sp,color=Color.Gray)
                                        Row {
                                            TextButton(onClick={scope.launch{resolveModerationReport(row)}}){Text("Resolve")}
                                            if(row.targetType=="post") TextButton(onClick={scope.launch{hideReportedPost(row)}}){Text("Hide post")}
                                            if(row.targetType=="comment") TextButton(onClick={scope.launch{hideReportedComment(row)}}){Text("Hide comment")}
                                            TextButton(onClick={scope.launch{banReportedAccount(row)}}){Text("Permanently ban",color=Color.Red)}
                                        }
                                    }
                                }
                            }
                            item { Text("Appeals",fontWeight=FontWeight.Bold,color=Ink,modifier=Modifier.padding(top=12.dp)) }
                            if(moderationAppeals.isEmpty()) item { Text("No pending appeals",color=Color.Gray) }
                            items(moderationAppeals,key={"appeal-"+it.id}) { row ->
                                Card(Modifier.fillMaxWidth(),colors=CardDefaults.cardColors(containerColor=Color(0xFF171720))) {
                                    Column(Modifier.padding(14.dp)) {
                                        Text(row.title,fontWeight=FontWeight.Bold,color=Ink)
                                        Text(row.detail,color=Ink)
                                        Row {
                                            TextButton(onClick={scope.launch{reviewModerationAppeal(row,true)}}){Text("Accept and lift ban")}
                                            TextButton(onClick={scope.launch{reviewModerationAppeal(row,false)}}){Text("Reject",color=Color.Red)}
                                        }
                                    }
                                }
                            }
                        }
                    }
                    "Feed" -> {
                        Row(Modifier.fillMaxWidth().padding(horizontal=16.dp,vertical=10.dp),horizontalArrangement=Arrangement.SpaceBetween) {
                            Text("Your learning feed",fontSize=20.sp,fontWeight=FontWeight.Bold,color=Ink)
                            TextButton(onClick={scope.launch{loadFeed()}}){Text("Refresh")}
                        }
                        if(posts.isEmpty()) Spacer(Modifier.fillMaxSize())
                        else LazyColumn(contentPadding=PaddingValues(14.dp),verticalArrangement=Arrangement.spacedBy(12.dp)) {
                            items(posts,key={it.id}) { post ->
                                Card(colors=CardDefaults.cardColors(containerColor=Color(0xFF171720)),shape=RoundedCornerShape(18.dp),modifier=Modifier.fillMaxWidth()) {
                                    Column(Modifier.padding(18.dp)) {
                                        Text(post.author,fontWeight=FontWeight.Bold,color=Ink)
                                        Text("@${post.handle}",color=Color.Gray,fontSize=12.sp)
                                        Text(post.body,color=Ink,modifier=Modifier.padding(top=12.dp),lineHeight=22.sp)
                                        post.image?.let { mediaUrl -> AsyncImage(model=mediaUrl,contentDescription="Post image",modifier=Modifier.fillMaxWidth().heightIn(max=420.dp).padding(top=10.dp),contentScale=androidx.compose.ui.layout.ContentScale.FillWidth) }
                                        Row(Modifier.fillMaxWidth().padding(top=10.dp),horizontalArrangement=Arrangement.SpaceBetween) {
                                            TextButton(onClick={scope.launch{toggleLike(post)}}){Text((if(likedIds.contains(post.id)) "♥ " else "♡ ")+post.likes)}
                                            TextButton(onClick={scope.launch{showCommentsFor=post.id;loadComments(post.id)}}){Text("Comments ${post.comments}")}
                                            TextButton(onClick={scope.launch{toggleSave(post)}}){Text(if(savedIds.contains(post.id)) "Saved" else "Save")}
                                            var reportMenuExpanded by remember(post.id) { mutableStateOf(false) }
                                            Box {
                                                TextButton(onClick={reportMenuExpanded=true}){Text("Report")}
                                                DropdownMenu(expanded=reportMenuExpanded,onDismissRequest={reportMenuExpanded=false}) {
                                                    listOf("sexual_content_or_nudity" to "Sexual content or nudity","harassment_or_hate" to "Harassment or hate","violence_or_self_harm" to "Violence or self-harm","spam_or_scam" to "Spam or scam","other" to "Other").forEach { (reason,label) ->
                                                        DropdownMenuItem(text={Text(label)},onClick={reportMenuExpanded=false;scope.launch{reportPost(post,reason)}})
                                                    }
                                                }
                                            }
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
                        LazyColumn { items(results){ item -> Card(Modifier.fillMaxWidth().padding(vertical=5.dp)){Column(Modifier.padding(14.dp)){Text(item.title,fontWeight=FontWeight.Bold);Text(item.detail,color=Color.Gray);Row { TextButton(onClick={scope.launch{toggleFollow(item.id)}}){Text(if(followingIds.contains(item.id)) "Following" else "Follow")};TextButton(onClick={scope.launch{startConversation(item.id)}}){Text("Message")};TextButton(onClick={scope.launch{blockUser(item.id)}}){Text("Block")} }}} } }
                    }
                    "Create" -> Column(Modifier.fillMaxSize().padding(16.dp)) {
                        Text("Share your progress",fontSize=20.sp,fontWeight=FontWeight.Bold,color=Ink)
                        OutlinedTextField(createText,{createText=it},label={Text("What are you learning or building?")},modifier=Modifier.fillMaxWidth().heightIn(min=150.dp),maxLines=8)
                        Row(verticalAlignment=Alignment.CenterVertically) {
                            Text("Photo uploads paused until safety screening is connected",color=Color.Gray,fontSize=12.sp)
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
                    "Messages" -> Column(Modifier.fillMaxSize().padding(16.dp)) {
                        Row(Modifier.fillMaxWidth(),horizontalArrangement=Arrangement.SpaceBetween,verticalAlignment=Alignment.CenterVertically) {
                            Text(if(activeConversationId==null) "Messages" else "Conversation",fontSize=20.sp,fontWeight=FontWeight.Bold,color=Ink)
                            Row {
                                if(activeConversationId!=null) TextButton(onClick={activeConversationId=null;chatMessages=emptyList()}){Text("Back")}
                                TextButton(onClick={scope.launch{if(activeConversationId==null)loadConversations() else loadChatMessages(activeConversationId!!)}}){Text("Refresh")}
                            }
                        }
                        if(activeConversationId==null) {
                            if(conversations.isEmpty()) Text("No conversations yet. Find someone in Explore and tap Message.",color=Color.Gray)
                            LazyColumn { items(conversations){ c -> TextButton(onClick={activeConversationId=c.id;scope.launch{loadChatMessages(c.id)}}){Text(c.title,color=Ink)} } }
                        } else {
                            LazyColumn(Modifier.weight(1f),verticalArrangement=Arrangement.spacedBy(8.dp)) {
                                items(chatMessages){ m ->
                                    val mine=m.senderId==userId
                                    Row(Modifier.fillMaxWidth(),horizontalArrangement=if(mine)Arrangement.End else Arrangement.Start) {
                                        Card(colors=CardDefaults.cardColors(containerColor=if(mine)Color(0xFF173D38) else Color(0xFF252530))) {
                                            Text(m.content,Modifier.padding(12.dp),color=Ink)
                                        }
                                    }
                                }
                            }
                            Row(verticalAlignment=Alignment.CenterVertically) {
                                OutlinedTextField(messageDraft,{messageDraft=it},modifier=Modifier.weight(1f),label={Text("Message")},maxLines=3)
                                TextButton(onClick={scope.launch{sendChatMessage()}},enabled=messageDraft.isNotBlank()&&!busy){Text("Send")}
                            }
                        }
                    }
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
                        items(comments){ c -> Column(Modifier.padding(vertical=5.dp)){Text(c.title,fontWeight=FontWeight.Bold);Text(c.detail);TextButton(onClick={scope.launch{reportComment(c.id)}}){Text("Report comment",color=Color.Gray)}} }
                    }
                    OutlinedTextField(commentText,{commentText=it},label={Text("Write a comment")},modifier=Modifier.fillMaxWidth())
                }
            },
            confirmButton={TextButton(onClick={scope.launch{addComment(postId)}}){Text("Send")}},
            dismissButton={TextButton(onClick={showCommentsFor=null}){Text("Close")}}
        )
    }
}



private fun hasModeratorRole(token:String):Boolean {
    return try {
        val payload=token.split(".").getOrNull(1) ?: return false
        val decoded=String(Base64.decode(payload,Base64.URL_SAFE or Base64.NO_WRAP or Base64.NO_PADDING),Charsets.UTF_8)
        val metadata=JSONObject(decoded).optJSONObject("app_metadata") ?: return false
        metadata.optString("role") in listOf("moderator","admin")
    } catch(_:Exception) { false }
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

private suspend fun api(method:String,path:String,token:String?,json:JSONObject?=null,prefer:String?=null):JSONObject = withContext(Dispatchers.IO) {
    val builder=Request.Builder().url(URL+path).addHeader("apikey",KEY).addHeader("Content-Type","application/json")
    if(token!=null) builder.addHeader("Authorization","Bearer $token")
    val body=json?.toString()?.toRequestBody("application/json".toMediaType())
    when(method) {
        "GET" -> builder.get()
        "POST" -> builder.post(body ?: "{}".toRequestBody("application/json".toMediaType())).addHeader("Prefer",prefer ?: "return=representation")
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
