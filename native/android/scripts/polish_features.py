#!/usr/bin/env python3
from pathlib import Path
import sys

p = Path(sys.argv[1] if len(sys.argv) > 1 else "native/android/app/src/main/java/com/skillect/app/MainActivity.kt")
t = p.read_text()
if "Your feed is ready" in t and "Sign out" in t:
    print("already polished")
    sys.exit(0)

old_feed_empty = 'if(posts.isEmpty()) Spacer(Modifier.fillMaxSize())'
new_feed_empty = '''if(posts.isEmpty()) {
                            Column(Modifier.fillMaxSize().padding(28.dp), verticalArrangement=Arrangement.Center) {
                                Text("Your feed is ready", color=Ink, fontSize=20.sp, fontWeight=FontWeight.Bold)
                                Text("Follow people, join communities, or create your first skill update.", color=Color.Gray, modifier=Modifier.padding(top=8.dp))
                                Button(onClick={tab="Create"}, modifier=Modifier.padding(top=16.dp)){Text("Create a post")}
                            }
                        }'''
if old_feed_empty in t:
    t = t.replace(old_feed_empty, new_feed_empty)

old_profile = '''                    "Profile" -> Column(Modifier.fillMaxSize().padding(20.dp)) {
                        Text(displayName.ifBlank{"Your profile"},fontSize=25.sp,fontWeight=FontWeight.Bold,color=Ink)
                        Text("@$username",color=Color.Gray)
                        OutlinedTextField(displayName,{displayName=it},label={Text("Display name")},modifier=Modifier.fillMaxWidth())
                        OutlinedTextField(bio,{bio=it},label={Text("Bio")},modifier=Modifier.fillMaxWidth(),maxLines=4)
                        Button(onClick={scope.launch{updateProfile()}}){Text("Save profile")}
                        Text("Posts: ${posts.count{it.authorId==userId}}",modifier=Modifier.padding(top=14.dp))
                        TextButton(onClick={scope.launch{loadFeed()}}){Text("Refresh profile")}
                    }'''
new_profile = '''                    "Profile" -> Column(Modifier.fillMaxSize().padding(20.dp)) {
                        Text(displayName.ifBlank{"Your profile"},fontSize=25.sp,fontWeight=FontWeight.Bold,color=Ink)
                        Text("@$username",color=Color.Gray)
                        OutlinedTextField(displayName,{displayName=it},label={Text("Display name")},modifier=Modifier.fillMaxWidth())
                        Spacer(Modifier.height(8.dp))
                        OutlinedTextField(bio,{bio=it},label={Text("Bio")},modifier=Modifier.fillMaxWidth(),maxLines=4)
                        Button(onClick={scope.launch{updateProfile()}}, modifier=Modifier.padding(top=12.dp).fillMaxWidth()){Text("Save profile")}
                        Text("Your posts: ${posts.count{it.authorId==userId}}",modifier=Modifier.padding(top=14.dp), color=Ink)
                        TextButton(onClick={scope.launch{loadFeed(); loadNotifications(); tab="Feed"}}){Text("Refresh")}
                        Spacer(Modifier.height(20.dp))
                        Text("Account", fontWeight=FontWeight.Bold, color=Ink)
                        Text("Skillect ${BuildConfig.VERSION_NAME}", color=Color.Gray, fontSize=12.sp)
                        TextButton(onClick={
                            token = null
                            userId = null
                            onSignOut()
                        }){Text("Sign out", color=Color.Red)}
                    }'''
if old_profile in t:
    t = t.replace(old_profile, new_profile)

if 'suspend fun followUser' not in t:
    t = t.replace(
        'suspend fun blockUser(targetId:String) {',
        '''suspend fun followUser(targetId:String) {
        val active=token ?: return
        val me=userId ?: return
        if(targetId==me) return
        try {
            api("POST","/rest/v1/follows",active,JSONObject().put("follower_id",me).put("following_id",targetId))
            error = "Followed"
        } catch(e:Exception){ error=e.message }
    }

    suspend fun blockUser(targetId:String) {'''
    )

old_exp = 'TextButton(onClick={scope.launch{blockUser(item.id)}}){Text("Block")}'
if old_exp in t and 'followUser(item.id)' not in t:
    t = t.replace(
        old_exp,
        'TextButton(onClick={scope.launch{followUser(item.id)}}){Text("Follow")}; TextButton(onClick={scope.launch{blockUser(item.id)}}){Text("Block")}'
    )

p.write_text(t)
print("polished", p, "size", len(t))
