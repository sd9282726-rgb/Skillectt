import { useAuth } from "@clerk/expo";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  StyleSheet,
  Platform,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useAppContext, UserProfile, Post } from "@/context/AppContext";
import { SKILL_CATEGORIES, getSkillColor, getSkillName } from "@/constants/skills";
import { Avatar } from "./index";
import { C } from "@/constants/colors";

function UserCard({ profile, onFollow }: { profile: UserProfile; onFollow: (id: string) => void }) {
  const { isFollowing } = useAppContext();
  const { userId } = useAuth();
  const router = useRouter();
  const following = isFollowing(profile.userId);
  const isMe = userId === profile.userId;

  return (
    <Pressable
      onPress={() => router.push(`/user/${profile.userId}`)}
      style={({ pressed }) => [styles.userCard, pressed && { opacity: 0.8 }]}
    >
      <Avatar uri={profile.avatarUri} name={profile.displayName} size={46} />
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{profile.displayName}</Text>
        <Text style={styles.userHandle}>@{profile.username}</Text>
        {profile.currentlyBuilding ? (
          <View style={styles.buildingRow}>
            <Feather name="tool" size={10} color={C.primary} />
            <Text style={styles.buildingText} numberOfLines={1}>{profile.currentlyBuilding}</Text>
          </View>
        ) : null}
        <View style={styles.skillsRow}>
          {profile.skills.slice(0, 3).map((s) => (
            <View key={s} style={[styles.miniSkill, { backgroundColor: getSkillColor(s) + "18", borderColor: getSkillColor(s) + "35" }]}>
              <Text style={[styles.miniSkillText, { color: getSkillColor(s) }]}>{getSkillName(s)}</Text>
            </View>
          ))}
        </View>
      </View>
      {!isMe && (
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onFollow(profile.userId);
          }}
          style={[styles.followBtn, following && styles.followingBtn]}
        >
          {following ? (
            <Feather name="check" size={13} color={C.dim} />
          ) : (
            <Text style={styles.followBtnText}>Follow</Text>
          )}
        </Pressable>
      )}
    </Pressable>
  );
}

function TrendCard({ post }: { post: Post }) {
  const router = useRouter();
  const skillColor = getSkillColor(post.skillTag);
  return (
    <Pressable
      onPress={() => router.push(`/post/${post.id}`)}
      style={({ pressed }) => [styles.trendCard, { borderColor: skillColor + "20" }, pressed && { opacity: 0.8 }]}
    >
      <View style={[styles.trendColorBar, { backgroundColor: skillColor }]} />
      <View style={styles.trendContent}>
        <View style={styles.trendTop}>
          <View style={[styles.trendSkill, { backgroundColor: skillColor + "18" }]}>
            <View style={[styles.trendDot, { backgroundColor: skillColor }]} />
            <Text style={[styles.trendSkillText, { color: skillColor }]}>{getSkillName(post.skillTag)}</Text>
          </View>
          <View style={styles.trendLikes}>
            <Feather name="heart" size={11} color="#FF4466" />
            <Text style={styles.trendLikeNum}>{post.likedBy.length}</Text>
          </View>
        </View>
        <Text style={styles.trendUser}>@{post.username}</Text>
        <Text style={styles.trendText} numberOfLines={2}>{post.content}</Text>
      </View>
    </Pressable>
  );
}

export default function ExploreScreen() {
  const { posts, getAllProfiles, followUser, unfollowUser, isFollowing } = useAppContext();
  const { userId } = useAuth();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [profiles, setProfiles] = useState<UserProfile[]>([]);

  useEffect(() => {
    getAllProfiles().then((ps) => setProfiles(ps.filter((p) => p.userId !== userId)));
  }, [userId]);

  const trending = useMemo(() => {
    let src = posts;
    if (catFilter !== "all") {
      const cat = SKILL_CATEGORIES.find((c) => c.id === catFilter);
      const ids = new Set(cat?.skills.map((s) => s.id) ?? []);
      src = src.filter((p) => ids.has(p.skillTag));
    }
    return [...src].sort((a, b) => b.likedBy.length - a.likedBy.length).slice(0, 12);
  }, [posts, catFilter]);

  const filteredProfiles = useMemo(() => {
    if (!query) return profiles;
    const q = query.toLowerCase();
    return profiles.filter(
      (p) =>
        p.username.includes(q) ||
        p.displayName.toLowerCase().includes(q) ||
        p.skills.some((s) => getSkillName(s).toLowerCase().includes(q))
    );
  }, [profiles, query]);

  const filteredPosts = useMemo(() => {
    if (!query) return [];
    const q = query.toLowerCase();
    return posts
      .filter(
        (p) =>
          p.content.toLowerCase().includes(q) ||
          p.username.includes(q) ||
          getSkillName(p.skillTag).toLowerCase().includes(q)
      )
      .slice(0, 10);
  }, [posts, query]);

  const handleFollow = async (targetId: string) => {
    if (isFollowing(targetId)) await unfollowUser(targetId);
    else await followUser(targetId);
    setProfiles((ps) => [...ps]);
  };

  const TOP = 60 + insets.top + (Platform.OS === "web" ? 67 : 0);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0), height: TOP }]}>
        <View style={styles.searchWrap}>
          <Feather name="search" size={16} color={C.dim} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search people, skills, posts..."
            placeholderTextColor={C.muted}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {query ? (
            <Pressable onPress={() => setQuery("")}>
              <Feather name="x" size={16} color={C.dim} />
            </Pressable>
          ) : null}
        </View>
      </View>

      <FlatList
        data={query ? filteredPosts : trending}
        keyExtractor={(i) => i.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.list,
          { paddingTop: TOP + 12, paddingBottom: 100 + insets.bottom + (Platform.OS === "web" ? 34 : 0) },
        ]}
        ListHeaderComponent={
          <View>
            {!query && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cats}>
                <Pressable
                  onPress={() => setCatFilter("all")}
                  style={[styles.cat, catFilter === "all" && styles.catActive]}
                >
                  <Text style={[styles.catText, catFilter === "all" && styles.catTextActive]}>All</Text>
                </Pressable>
                {SKILL_CATEGORIES.map((c) => (
                  <Pressable
                    key={c.id}
                    onPress={() => setCatFilter(c.id)}
                    style={[styles.cat, catFilter === c.id && styles.catActive]}
                  >
                    <Text style={[styles.catText, catFilter === c.id && styles.catTextActive]}>{c.name}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            )}

            {query ? (
              <View>
                {filteredProfiles.length > 0 && (
                  <View>
                    <Text style={styles.sectionLabel}>People</Text>
                    {filteredProfiles.map((p) => (
                      <UserCard key={p.userId} profile={p} onFollow={handleFollow} />
                    ))}
                    {filteredPosts.length > 0 && (
                      <Text style={[styles.sectionLabel, { marginTop: 24 }]}>Posts</Text>
                    )}
                  </View>
                )}
              </View>
            ) : (
              <View>
                <Text style={styles.sectionLabel}>People to follow</Text>
                {profiles.slice(0, 5).map((p) => (
                  <UserCard key={p.userId} profile={p} onFollow={handleFollow} />
                ))}
                <Text style={[styles.sectionLabel, { marginTop: 28 }]}>Trending Posts</Text>
              </View>
            )}
          </View>
        }
        renderItem={({ item }) => <TrendCard post={item} />}
        ListEmptyComponent={
          query ? (
            <View style={styles.empty}>
              <Feather name="search" size={28} color={C.border2} />
              <Text style={styles.emptyText}>No results for "{query}"</Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: "#040410",
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    paddingHorizontal: 16,
    justifyContent: "flex-end",
    paddingBottom: 12,
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.card,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 44,
    borderWidth: 1,
    borderColor: C.border,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: C.text,
  },
  list: { paddingHorizontal: 16 },
  cats: { flexDirection: "row", gap: 8, paddingBottom: 16 },
  cat: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
  },
  catActive: { backgroundColor: C.primaryDim, borderColor: C.primaryBorder },
  catText: { fontSize: 13, fontFamily: "Inter_500Medium", color: C.dim },
  catTextActive: { color: C.primary },
  sectionLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: C.dim,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 14,
  },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    gap: 12,
  },
  userInfo: { flex: 1 },
  userName: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: C.text },
  userHandle: { fontSize: 12, fontFamily: "Inter_400Regular", color: C.dim, marginTop: 1 },
  buildingRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 4 },
  buildingText: { fontSize: 11, fontFamily: "Inter_400Regular", color: C.primary, flex: 1 },
  skillsRow: { flexDirection: "row", gap: 5, marginTop: 6, flexWrap: "wrap" },
  miniSkill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
  },
  miniSkillText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  followBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: C.primary,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  followingBtn: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: C.border2,
    shadowColor: "transparent",
  },
  followBtnText: { fontSize: 12, fontFamily: "Inter_700Bold", color: C.bg },
  trendCard: {
    flexDirection: "row",
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
    overflow: "hidden",
  },
  trendColorBar: { width: 3 },
  trendContent: { flex: 1, padding: 14 },
  trendTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  trendSkill: { flexDirection: "row", alignItems: "center", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, gap: 5 },
  trendDot: { width: 4, height: 4, borderRadius: 2 },
  trendSkillText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  trendLikes: { flexDirection: "row", alignItems: "center", gap: 4 },
  trendLikeNum: { fontSize: 11, fontFamily: "Inter_500Medium", color: "#FF4466" },
  trendUser: { fontSize: 11, fontFamily: "Inter_500Medium", color: C.dim, marginBottom: 4 },
  trendText: { fontSize: 13, fontFamily: "Inter_400Regular", color: C.subtext, lineHeight: 18 },
  empty: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", color: C.dim },
});
