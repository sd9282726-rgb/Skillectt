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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useAppContext, UserProfile, Post } from "@/context/AppContext";
import { getSkillColor, getSkillName, SKILLS } from "@/constants/skills";
import { Avatar } from "../(tabs)/index";

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
            <Feather name="arrow-left" size={22} color="#F0F0FA" />
          </Pressable>
        </View>
        <View style={[styles.center, { paddingTop: TOP }]}>
          <ActivityIndicator color="#00D4FF" />
        </View>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0), height: TOP }]}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color="#F0F0FA" />
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
        <Avatar uri={profile.avatarUri} name={profile.displayName} size={72} />
        {!isMe && (
          <View style={styles.headerBtns}>
            <Pressable
              onPress={handleFollow}
              style={[styles.followBtn, following && styles.followingBtn]}
            >
              <Text
                style={[
                  styles.followBtnText,
                  following && styles.followingBtnText,
                ]}
              >
                {following ? "Following" : "Follow"}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => router.push(`/messages/${paramUserId}`)}
              style={styles.msgBtn}
            >
              <Feather name="message-circle" size={16} color="#F0F0FA" />
            </Pressable>
          </View>
        )}
      </View>

      <Text style={styles.displayName}>{profile.displayName}</Text>
      <Text style={styles.username}>@{profile.username}</Text>

      {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}

      {profile.currentlyBuilding ? (
        <View style={styles.buildingRow}>
          <Feather name="tool" size={12} color="#00D4FF" />
          <Text style={styles.buildingText}>
            Building: {profile.currentlyBuilding}
          </Text>
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
        <View style={styles.skillsWrap}>
          {profileSkills.map((s) => (
            <View
              key={s.id}
              style={[
                styles.skillBadge,
                {
                  backgroundColor: s.color + "18",
                  borderColor: s.color + "44",
                },
              ]}
            >
              <View style={[styles.dot, { backgroundColor: s.color }]} />
              <Text style={[styles.skillText, { color: s.color }]}>{s.name}</Text>
            </View>
          ))}
        </View>
      )}

      <Text style={styles.postsHeader}>Posts</Text>
    </View>
  );

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
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color="#F0F0FA" />
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
          {
            paddingTop: TOP + 8,
            paddingBottom: 80 + insets.bottom + (Platform.OS === "web" ? 34 : 0),
          },
        ]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={Header}
        renderItem={({ item }) => {
          const c = getSkillColor(item.skillTag);
          return (
            <Pressable
              onPress={() => router.push(`/post/${item.id}`)}
              style={({ pressed }) => [styles.mini, pressed && { opacity: 0.75 }]}
            >
              <View style={styles.miniTop}>
                <View style={[styles.miniDot, { backgroundColor: c }]} />
                <Text style={[styles.miniDay, { color: c }]}>
                  {item.progressDay ? `Day ${item.progressDay}` : getSkillName(item.skillTag)}
                </Text>
              </View>
              <Text style={styles.miniContent} numberOfLines={3}>
                {item.content}
              </Text>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyPosts}>
            <Text style={styles.emptyText}>No posts yet</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A0A0F" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: "#0A0A0F",
    borderBottomWidth: 1,
    borderBottomColor: "#141420",
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backBtn: { padding: 8 },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    color: "#F0F0FA",
    textAlign: "center",
  },
  notFound: { fontSize: 14, fontFamily: "Inter_400Regular", color: "#444460" },
  grid: { paddingHorizontal: 16, gap: 8 },
  profileBlock: { paddingBottom: 16 },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 14,
    marginTop: 16,
  },
  headerBtns: { flexDirection: "row", gap: 8, alignItems: "center" },
  followBtn: {
    paddingHorizontal: 20,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: "#00D4FF",
  },
  followingBtn: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#1E1E32",
  },
  followBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#0A0A0F" },
  followingBtnText: { color: "#666688" },
  msgBtn: {
    padding: 10,
    borderRadius: 20,
    backgroundColor: "#12121C",
    borderWidth: 1,
    borderColor: "#1E1E32",
  },
  displayName: { fontSize: 20, fontFamily: "Inter_700Bold", color: "#F0F0FA", marginBottom: 2 },
  username: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#555578", marginBottom: 10 },
  bio: { fontSize: 14, fontFamily: "Inter_400Regular", color: "#A0A0C0", lineHeight: 20, marginBottom: 12 },
  buildingRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 14 },
  buildingText: { fontSize: 13, fontFamily: "Inter_500Medium", color: "#00D4FF" },
  statsRow: {
    flexDirection: "row",
    backgroundColor: "#0D0D18",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#141420",
    marginBottom: 14,
  },
  stat: { flex: 1, alignItems: "center" },
  statVal: { fontSize: 20, fontFamily: "Inter_700Bold", color: "#F0F0FA" },
  statLabel: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#555578", marginTop: 2 },
  statDiv: { width: 1, backgroundColor: "#1E1E32" },
  skillsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 16 },
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
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: "#444460",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
    borderTopWidth: 1,
    borderTopColor: "#141420",
    paddingTop: 14,
  },
  mini: {
    flex: 1,
    backgroundColor: "#0D0D18",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#141420",
    minHeight: 100,
  },
  miniTop: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 6 },
  miniDot: { width: 5, height: 5, borderRadius: 3 },
  miniDay: { fontSize: 10, fontFamily: "Inter_700Bold" },
  miniContent: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "#888899",
    lineHeight: 16,
  },
  emptyPosts: { paddingTop: 32, alignItems: "center" },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", color: "#333358" },
});
