#!/usr/bin/env python3
"""Inject Get inspired strip on Home (Skillect core — no stories)."""
from pathlib import Path
import sys
p = Path(sys.argv[1] if len(sys.argv) > 1 else "native/android/app/src/main/java/com/skillect/app/MainActivity.kt")
t = p.read_text()
if "Get inspired" in t:
    print("inspiration already present")
    sys.exit(0)

old1 = '''                    "Home" -> {
                        Row(Modifier.fillMaxWidth().padding(horizontal=16.dp,vertical=10.dp),horizontalArrangement=Arrangement.SpaceBetween) {
                            Text("Your learning feed",fontSize=20.sp,fontWeight=FontWeight.Bold,color=Ink)
                            TextButton(onClick={scope.launch{loadFeed()}}){Text("Refresh")}
                        }
'''
old2 = '''                    "Home" -> {
                        Row(Modifier.fillMaxWidth().padding(horizontal=16.dp,vertical=10.dp),horizontalArrangement=Arrangement.SpaceBetween) {
                            Text("For you",fontSize=18.sp,fontWeight=FontWeight.Bold,color=Ink)
                            TextButton(onClick={scope.launch{loadFeed()}}){Text("Refresh")}
                        }
'''
new = '''                    "Home" -> {
                        Column(Modifier.fillMaxWidth().padding(horizontal=14.dp, vertical=8.dp)) {
                            Text("Get inspired", fontWeight=FontWeight.Bold, color=Ink, fontSize=16.sp)
                            Row(Modifier.fillMaxWidth().padding(top=8.dp), horizontalArrangement=Arrangement.spacedBy(8.dp)) {
                                listOf(
                                    Triple("Share a project", "Show what you build", "Create"),
                                    Triple("Learn in public", "Post a skill update", "Create"),
                                    Triple("Find people", "Creators like you", "Explore"),
                                    Triple("Join a club", "Communities", "Communities")
                                ).forEach { (title, sub, go) ->
                                    Card(
                                        colors=CardDefaults.cardColors(containerColor=Color(0xFF15151D)),
                                        shape=RoundedCornerShape(14.dp),
                                        modifier=Modifier.weight(1f).clickable { tab = go }
                                    ) {
                                        Column(Modifier.padding(10.dp)) {
                                            Text(title, color=Ink, fontSize=11.sp, fontWeight=FontWeight.SemiBold, maxLines=2)
                                            Text(sub, color=Color.Gray, fontSize=9.sp, modifier=Modifier.padding(top=2.dp), maxLines=2)
                                        }
                                    }
                                }
                            }
                            Row(Modifier.fillMaxWidth().padding(top=10.dp), horizontalArrangement=Arrangement.SpaceBetween, verticalAlignment=Alignment.CenterVertically) {
                                Text("For you", fontSize=18.sp, fontWeight=FontWeight.Bold, color=Ink)
                                TextButton(onClick={scope.launch{loadFeed()}}){Text("Refresh")}
                            }
                        }
'''
if old1 in t:
    t = t.replace(old1, new, 1)
elif old2 in t:
    t = t.replace(old2, new, 1)
else:
    needle = 'Text("Your learning feed"'
    if needle in t:
        t = t.replace(needle, 'Text("For you"', 1)
        print("partial header rename only")
    else:
        print("no home header match; skip")
        sys.exit(0)
if "import androidx.compose.foundation.clickable" not in t:
    t = t.replace(
        "import androidx.compose.foundation.background",
        "import androidx.compose.foundation.background\nimport androidx.compose.foundation.clickable",
    )
p.write_text(t)
print("inspiration injected", "Get inspired" in p.read_text())
