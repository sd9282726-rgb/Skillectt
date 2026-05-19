import { useAuth } from "@clerk/expo";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Platform,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useAppContext, UserProfile, Post } from "@/context/AppContext";
import { getSkillColor, getSkillName, SKILLS } from "@/constants/skills";
import { Avatar } from "../(tabs)/index";
import { C } from "@/constants/colors";

export default function UserProfileScreen() {
  const { userId: paramUserId } = useLocalSearchParams<{ userId: string }>();
  const { userId } = useAuth();
  const {
    getUserProfile,
    getPostsByUser,
    followUser,
    unfollowUser,
    isFollowing,
    getFollowerCount,
    getFollowingCount,
  } = useAppContext();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const isMe = userId === paramUserId;
  const following = paramUserId ? isFollowing(paramUserId) : false;

  useEffect(() => {
    if (!paramUserId) return;
    Promise.all([
      getUserProfile(paramUserId),
      getFollowerCount(paramUserId),
      getFollowingCount(paramUserId),
    ]).then(([p, fc, foc]) => {
      setProfile(p);
      setFollowerCount(fc);
      setFollowingCount(foc);
      if (p) setPosts(getPostsByUser(paramUserId));
      setLoading(false);
    });
  }, [paramUserId]);

  const handleFollow = async () => {
    if (!paramUserId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (following) {
      await unfollowUser(paramUserId);
      setFollowerCount((c) => Math.max(0, c - 1));
    } else {
      await followUser(paramUserId);
      setFollowerCount((c) => c + 1);
    }
  };

  const TOP = 56 + insets.top + (Platform.OS === "web" ? 67 : 0);

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0), height: TOP }]}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color={C.text} />
          </Pressable>
        </View>
        <View style={[styles.center, { paddingTop: TOP }]}>
          <ActivityIndicator color={C.primary} />
        </View>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0), height: TOP }]}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color={C.text} />
          </Pressable>
        </View>
        <View style={[styles.center, { paddingTop: TOP }]}>
          <Text style={styles.notFound}>User not found</Text>
        </View>
      </View>
    );
  }

  const profileSkills = SKILLS.filter((s) => profile.skills.includes(s.id));

  const Header = (
    <View style={styles.profileBlock}>
      <View style={styles.topRow}>
        <View style={styles.avatarGlow}>
          <Avatar uri={profile.avatarUri} name={profile.displayName} size={72} />
        </View>
        {!isMe && (
          <View style={styles.headerBtns}>
            <Pressable
              onPress={handleFollow}
              style={({ pressed }) => [
                styles.followBtn,
                following && styles.followingBtn,
                pressed && { opacity: 0.8 },
              ]}
            >
              <Text style={[styles.followBtnText, following && styles.followingBtnText]}>
                {following ? "Following" : "Follow"}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => router.push(`/messages/${paramUserId}`)}
              style={styles.msgBtn}
            >
              <Feather name="message-circle" size={16} color={C.subtext} />
            </Pressable>
          </View>
        )}
      </View>

      <Text style={styles.displayName}>{profile.displayName}</Text>
      <Text style={styles.username}>@{profile.username}</Text>
      {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}

      {profile.currentlyBuilding ? (
        <View style={styles.buildingRow}>
          <Feather name="tool" size={12} color={C.primary} />
          <Text style={styles.buildingText}>Building: {profile.currentlyBuilding}</Text>
        </View>
      ) : null}

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statVal}>{posts.length}</Text>
          <Text style={styles.statLabel}>Posts</Text>
        </View>
        <View style={styles.statDiv} />
        <View style={styles.stat}>
          <Text style={styles.statVal}>{followerCount}</Text>
          <Text style={styles.statLabel}>Followers</Text>
        </View>
        <View style={styles.statDiv} />
        <View style={styles.stat}>
          <Text style={styles.statVal}>{followingCount}</Text>
          <Text style={styles.statLabel}>Following</Text>
        </View>
      </View>

      {profileSkills.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.skillsWrap}>
          {profileSkills.map((s) => (
            <View
              key={s.id}
              style={[styles.skillBadge, { backgroundColor: s.color + "14", borderColor: s.color + "40" }]}
            >
              <View style={[styles.dot, { backgroundColor: s.color }]} />
              <Text style={[styles.skillText, { color: s.color }]}>{s.name}</Text>
            </View>
          ))}
        </ScrollView>
      )}

      <Text style={styles.postsHeader}>Posts</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0), height: TOP }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={C.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={{ width: 38 }} />
      </View>

      <FlatList
        data={posts}
        keyExtractor={(i) => i.id}
        numColumns={2}
        columnWrapperStyle={{ gap: 8 }}
        contentContainerStyle={[
          styles.grid,
          { paddingTop: TOP + 8, paddingBottom: 80 + insets.bottom + (Platform.OS === "web" ? 34 : 0) },
        ]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={Header}
        renderItem={({ item }) => {
          const c = getSkillColor(item.skillTag);
          return (
            <Pressable
              onPress={() => router.push(`/post/${item.id}`)}
              style={({ pressed }) => [styles.mini, { borderColor: c + "20" }, pressed && { opacity: 0.75 }]}
            >
              <View style={styles.miniTop}>
                <View style={[styles.miniDot, { backgroundColor: c, shadowColor: c, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 4 }]} />
                <Text style={[styles.miniDay, { color: c }]}>
                  {item.progressDay ? `Day ${item.progressDay}` : getSkillName(item.skillTag)}
                </Text>
              </View>
              <Text style={styles.miniContent} numberOfLines={3}>{item.content}</Text>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyPosts}>
            <Feather name="edit-3" size={24} color={C.border2} />
            <Text style={styles.emptyText}>No posts yet</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: "#040410",
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backBtn: { padding: 8 },
  headerTitle: { flex: 1, fontSize: 17, fontFamily: "Inter_600SemiBold", color: C.text, textAlign: "center" },
  notFound: { fontSize: 14, fontFamily: "Inter_400Regular", color: C.dim },
  grid: { paddingHorizontal: 16, gap: 8 },
  profileBlock: { paddingBottom: 16 },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 14,
    marginTop: 16,
  },
  avatarGlow: { shadowColor: C.primary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.25, shadowRadius: 16 },
  headerBtns: { flexDirection: "row", gap: 8, alignItems: "center" },
  followBtn: {
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: C.primary,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  followingBtn: { backgroundColor: "transparent", borderWidth: 1, borderColor: C.border2, shadowColor: "transparent" },
  followBtnText: { fontSize: 13, fontFamily: "Inter_700Bold", color: C.bg },
  followingBtnText: { color: C.dim },
  msgBtn: { padding: 10, borderRadius: 20, backgroundColor: C.cardAlt, borderWidth: 1, borderColor: C.border2 },
  displayName: { fontSize: 20, fontFamily: "Inter_700Bold", color: C.text, marginBottom: 2 },
  username: { fontSize: 13, fontFamily: "Inter_400Regular", color: C.dim, marginBottom: 10 },
  bio: { fontSize: 14, fontFamily: "Inter_400Regular", color: C.subtext, lineHeight: 20, marginBottom: 12 },
  buildingRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 14 },
  buildingText: { fontSize: 13, fontFamily: "Inter_500Medium", color: C.primary },
  statsRow: {
    flexDirection: "row",
    backgroundColor: C.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 14,
  },
  stat: { flex: 1, alignItems: "center" },
  statVal: { fontSize: 20, fontFamily: "Inter_700Bold", color: C.text },
  statLabel: { fontSize: 11, fontFamily: "Inter_400Regular", color: C.dim, marginTop: 2 },
  statDiv: { width: 1, backgroundColor: C.border },
  skillsWrap: { flexDirection: "row", gap: 6, marginBottom: 16 },
  skillBadge: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    gap: 5,
  },
  dot: { width: 5, height: 5, borderRadius: 3 },
  skillText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  postsHeader: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: C.dim,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingTop: 14,
  },
  mini: {
    flex: 1,
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    minHeight: 100,
  },
  miniTop: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 6 },
  miniDot: { width: 5, height: 5, borderRadius: 3 },
  miniDay: { fontSize: 10, fontFamily: "Inter_700Bold" },
  miniContent: { fontSize: 11, fontFamily: "Inter_400Regular", color: C.subtext, lineHeight: 16 },
  emptyPosts: { paddingTop: 32, alignItems: "center", gap: 8 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", color: C.dim },
});
