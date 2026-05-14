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
  Image,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useAppContext, UserProfile, Post } from "@/context/AppContext";
import { SKILL_CATEGORIES, getSkillColor, getSkillName } from "@/constants/skills";
import { Avatar } from "./index";

function UserCard({
  profile,
  onFollow,
}: {
  profile: UserProfile;
  onFollow: (id: string) => void;
}) {
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
      <Avatar
        uri={profile.avatarUri}
        name={profile.displayName}
        size={44}
      />
      <View style={styles.userCardInfo}>
        <Text style={styles.userCardName}>{profile.displayName}</Text>
        <Text style={styles.userCardUsername}>@{profile.username}</Text>
        <View style={styles.skillsRow}>
          {profile.skills.slice(0, 2).map((s) => (
            <View
              key={s}
              style={[
                styles.miniSkill,
                { backgroundColor: getSkillColor(s) + "22" },
              ]}
            >
              <Text style={[styles.miniSkillText, { color: getSkillColor(s) }]}>
                {getSkillName(s)}
              </Text>
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
          <Text style={[styles.followBtnText, following && styles.followingBtnText]}>
            {following ? "Following" : "Follow"}
          </Text>
        </Pressable>
      )}
    </Pressable>
  );
}

function MiniPost({ post }: { post: Post }) {
  const router = useRouter();
  const skillColor = getSkillColor(post.skillTag);
  return (
    <Pressable
      onPress={() => router.push(`/post/${post.id}`)}
      style={({ pressed }) => [styles.trendCard, pressed && { opacity: 0.8 }]}
    >
      <View style={styles.trendTop}>
        <View style={[styles.trendSkill, { backgroundColor: skillColor + "22" }]}>
          <View style={[styles.dot, { backgroundColor: skillColor }]} />
          <Text style={[styles.trendSkillText, { color: skillColor }]}>
            {getSkillName(post.skillTag)}
          </Text>
        </View>
        <View style={styles.trendLikes}>
          <Feather name="heart" size={11} color="#FF4444" />
          <Text style={styles.trendLikeCount}>{post.likedBy.length}</Text>
        </View>
      </View>
      <Text style={styles.trendUser}>@{post.username}</Text>
      <Text style={styles.trendContent} numberOfLines={2}>
        {post.content}
      </Text>
    </Pressable>
  );
}

export default function ExploreScreen() {
  const { posts, getAllProfiles, followUser, unfollowUser, isFollowing } =
    useAppContext();
  const { userId } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();

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
    return [...src].sort((a, b) => b.likedBy.length - a.likedBy.length).slice(0, 10);
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

  const TOP = 52 + insets.top + (Platform.OS === "web" ? 67 : 0);

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0),
            height: TOP,
          },
        ]}
      >
        <View style={styles.searchWrap}>
          <Feather name="search" size={16} color="#555578" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search people, skills, posts..."
            placeholderTextColor="#333358"
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {query ? (
            <Pressable onPress={() => setQuery("")}>
              <Feather name="x" size={16} color="#555578" />
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
          {
            paddingTop: TOP + 8,
            paddingBottom: 90 + insets.bottom + (Platform.OS === "web" ? 34 : 0),
          },
        ]}
        ListHeaderComponent={
          <View>
            {!query && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.cats}
              >
                <Pressable
                  onPress={() => setCatFilter("all")}
                  style={[styles.cat, catFilter === "all" && styles.catActive]}
                >
                  <Text
                    style={[
                      styles.catText,
                      catFilter === "all" && styles.catTextActive,
                    ]}
                  >
                    All
                  </Text>
                </Pressable>
                {SKILL_CATEGORIES.map((c) => (
                  <Pressable
                    key={c.id}
                    onPress={() => setCatFilter(c.id)}
                    style={[styles.cat, catFilter === c.id && styles.catActive]}
                  >
                    <Text
                      style={[
                        styles.catText,
                        catFilter === c.id && styles.catTextActive,
                      ]}
                    >
                      {c.name}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            )}

            {query ? (
              <>
                {filteredProfiles.length > 0 && (
                  <View>
                    <Text style={styles.sectionTitle}>People</Text>
                    {filteredProfiles.map((p) => (
                      <UserCard key={p.userId} profile={p} onFollow={handleFollow} />
                    ))}
                    {filteredPosts.length > 0 && (
                      <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Posts</Text>
                    )}
                  </View>
                )}
              </>
            ) : (
              <View>
                <Text style={styles.sectionTitle}>People to follow</Text>
                {profiles.slice(0, 5).map((p) => (
                  <UserCard key={p.userId} profile={p} onFollow={handleFollow} />
                ))}
                <Text style={[styles.sectionTitle, { marginTop: 20 }]}>
                  Trending posts
                </Text>
              </View>
            )}
          </View>
        }
        renderItem={({ item }) => <MiniPost post={item} />}
        ListEmptyComponent={
          query ? (
            <View style={styles.empty}>
              <Feather name="search" size={32} color="#1E1E32" />
              <Text style={styles.emptyText}>No results for "{query}"</Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A0A0F" },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: "#0A0A0F",
    borderBottomWidth: 1,
    borderBottomColor: "#141420",
    paddingHorizontal: 16,
    justifyContent: "flex-end",
    paddingBottom: 10,
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#12121C",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 40,
    borderWidth: 1,
    borderColor: "#1E1E32",
    gap: 8,
  },
  searchIcon: {},
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#F0F0FA",
  },
  list: { paddingHorizontal: 16, gap: 0 },
  cats: {
    flexDirection: "row",
    gap: 8,
    paddingBottom: 16,
  },
  cat: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#12121C",
    borderWidth: 1,
    borderColor: "#1E1E32",
  },
  catActive: { backgroundColor: "#00D4FF18", borderColor: "#00D4FF55" },
  catText: { fontSize: 13, fontFamily: "Inter_500Medium", color: "#666688" },
  catTextActive: { color: "#00D4FF" },
  sectionTitle: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: "#444460",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#141420",
    gap: 12,
  },
  userCardInfo: { flex: 1 },
  userCardName: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#F0F0FA",
  },
  userCardUsername: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "#555578",
    marginTop: 1,
  },
  skillsRow: { flexDirection: "row", gap: 4, marginTop: 4 },
  miniSkill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  miniSkillText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  followBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#00D4FF",
  },
  followingBtn: { backgroundColor: "transparent", borderWidth: 1, borderColor: "#1E1E32" },
  followBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#0A0A0F" },
  followingBtnText: { color: "#666688" },
  trendCard: {
    backgroundColor: "#0D0D18",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#141420",
    marginBottom: 8,
  },
  trendTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  trendSkill: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 4,
  },
  dot: { width: 4, height: 4, borderRadius: 2 },
  trendSkillText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  trendLikes: { flexDirection: "row", alignItems: "center", gap: 4 },
  trendLikeCount: { fontSize: 11, fontFamily: "Inter_500Medium", color: "#FF4444" },
  trendUser: { fontSize: 12, fontFamily: "Inter_500Medium", color: "#555578", marginBottom: 4 },
  trendContent: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#A0A0C0", lineHeight: 18 },
  empty: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", color: "#444460" },
});
