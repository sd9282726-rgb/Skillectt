import { useAuth, useClerk } from "@clerk/expo";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Platform,
  Alert,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useAppContext, Post, UserProfile } from "@/context/AppContext";
import { getSkillColor, getSkillName, SKILLS } from "@/constants/skills";
import { Avatar } from "./index";

function MiniPost({ post }: { post: Post }) {
  const router = useRouter();
  const c = getSkillColor(post.skillTag);
  return (
    <Pressable
      onPress={() => router.push(`/post/${post.id}`)}
      style={({ pressed }) => [styles.mini, pressed && { opacity: 0.75 }]}
    >
      <View style={styles.miniTop}>
        <View style={[styles.miniDot, { backgroundColor: c }]} />
        {post.progressDay !== undefined ? (
          <Text style={[styles.miniDay, { color: c }]}>Day {post.progressDay}</Text>
        ) : (
          <Text style={[styles.miniDay, { color: c }]}>{getSkillName(post.skillTag)}</Text>
        )}
      </View>
      <Text style={styles.miniContent} numberOfLines={3}>
        {post.content}
      </Text>
      <View style={styles.miniFooter}>
        <Feather name="heart" size={10} color="#444460" />
        <Text style={styles.miniStat}>{post.likedBy.length}</Text>
        <Feather name="message-circle" size={10} color="#444460" />
        <Text style={styles.miniStat}>{post.commentCount}</Text>
      </View>
    </Pressable>
  );
}

export default function ProfileScreen() {
  const { userId } = useAuth();
  const { signOut } = useClerk();
  const {
    currentUserProfile,
    getPostsByUser,
    getFollowerCount,
    getFollowingCount,
  } = useAppContext();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [viewMode, setViewMode] = useState<"grid" | "feed">("grid");

  const userPosts = userId ? getPostsByUser(userId) : [];

  useEffect(() => {
    if (userId) {
      getFollowerCount(userId).then(setFollowerCount);
      getFollowingCount(userId).then(setFollowingCount);
    }
  }, [userId, currentUserProfile]);

  const handleSignOut = () => {
    Alert.alert("Sign out", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: async () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          await signOut();
          router.replace("/");
        },
      },
    ]);
  };

  if (!currentUserProfile) {
    return (
      <View style={styles.container}>
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  const profileSkills = SKILLS.filter((s) =>
    currentUserProfile.skills.includes(s.id)
  );

  const Header = (
    <View style={styles.profileBlock}>
      <View style={styles.profileTopRow}>
        <Avatar
          uri={currentUserProfile.avatarUri}
          name={currentUserProfile.displayName}
          size={72}
        />
        <View style={styles.headerActions}>
          <Pressable
            onPress={() => router.push("/edit-profile")}
            style={styles.editBtn}
          >
            <Feather name="edit-2" size={14} color="#F0F0FA" />
            <Text style={styles.editBtnText}>Edit</Text>
          </Pressable>
          <Pressable onPress={handleSignOut} style={styles.iconBtn}>
            <Feather name="log-out" size={18} color="#444460" />
          </Pressable>
        </View>
      </View>

      <Text style={styles.displayName}>{currentUserProfile.displayName}</Text>
      <Text style={styles.username}>@{currentUserProfile.username}</Text>

      {currentUserProfile.bio ? (
        <Text style={styles.bio}>{currentUserProfile.bio}</Text>
      ) : null}

      {currentUserProfile.currentlyBuilding ? (
        <View style={styles.buildingRow}>
          <Feather name="tool" size={12} color="#00D4FF" />
          <Text style={styles.buildingText}>
            Building: {currentUserProfile.currentlyBuilding}
          </Text>
        </View>
      ) : null}

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statVal}>{userPosts.length}</Text>
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
              <Text style={[styles.skillBadgeText, { color: s.color }]}>
                {s.name}
              </Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.viewToggle}>
        <Pressable
          onPress={() => setViewMode("grid")}
          style={[styles.toggleBtn, viewMode === "grid" && styles.toggleActive]}
        >
          <Feather
            name="grid"
            size={16}
            color={viewMode === "grid" ? "#00D4FF" : "#444460"}
          />
        </Pressable>
        <Pressable
          onPress={() => setViewMode("feed")}
          style={[styles.toggleBtn, viewMode === "feed" && styles.toggleActive]}
        >
          <Feather
            name="list"
            size={16}
            color={viewMode === "feed" ? "#00D4FF" : "#444460"}
          />
        </Pressable>
      </View>
    </View>
  );

  const TOP = insets.top + (Platform.OS === "web" ? 67 : 0);

  if (viewMode === "grid") {
    return (
      <View style={styles.container}>
        <FlatList
          data={userPosts}
          keyExtractor={(i) => i.id}
          numColumns={2}
          columnWrapperStyle={{ gap: 8 }}
          contentContainerStyle={[
            styles.gridList,
            {
              paddingTop: TOP,
              paddingBottom: 90 + insets.bottom + (Platform.OS === "web" ? 34 : 0),
            },
          ]}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={Header}
          renderItem={({ item }) => <MiniPost post={item} />}
          ListEmptyComponent={
            <View style={styles.emptyPosts}>
              <Feather name="edit-3" size={28} color="#1E1E32" />
              <Text style={styles.emptyTitle}>No posts yet</Text>
              <Text style={styles.emptyText}>
                Share your first progress update
              </Text>
            </View>
          }
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={userPosts}
        keyExtractor={(i) => i.id}
        contentContainerStyle={[
          styles.feedList,
          {
            paddingTop: TOP,
            paddingBottom: 90 + insets.bottom + (Platform.OS === "web" ? 34 : 0),
          },
        ]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={Header}
        renderItem={({ item }) => (
          <View
            style={{
              marginHorizontal: 16,
              marginBottom: 8,
              backgroundColor: "#0D0D18",
              borderRadius: 14,
              padding: 14,
              borderWidth: 1,
              borderColor: "#141420",
            }}
          >
            <View style={styles.miniTop}>
              <View
                style={[
                  styles.miniDot,
                  { backgroundColor: getSkillColor(item.skillTag) },
                ]}
              />
              <Text
                style={[
                  styles.miniDay,
                  { color: getSkillColor(item.skillTag) },
                ]}
              >
                {item.progressDay ? `Day ${item.progressDay}` : getSkillName(item.skillTag)}
              </Text>
            </View>
            <Text
              style={{
                fontSize: 14,
                fontFamily: "Inter_400Regular",
                color: "#C8C8E0",
                lineHeight: 20,
                marginTop: 6,
              }}
            >
              {item.content}
            </Text>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyPosts}>
            <Feather name="edit-3" size={28} color="#1E1E32" />
            <Text style={styles.emptyTitle}>No posts yet</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A0A0F" },
  loadingText: {
    color: "#444460",
    fontFamily: "Inter_400Regular",
    fontSize: 14,
  },
  profileBlock: { paddingHorizontal: 16, paddingBottom: 8 },
  profileTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
    marginTop: 16,
  },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#12121C",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#1E1E32",
  },
  editBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#F0F0FA" },
  iconBtn: { padding: 8 },
  displayName: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: "#F0F0FA",
    marginBottom: 2,
  },
  username: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#555578",
    marginBottom: 10,
  },
  bio: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#A0A0C0",
    lineHeight: 20,
    marginBottom: 10,
  },
  buildingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 16,
  },
  buildingText: { fontSize: 13, fontFamily: "Inter_500Medium", color: "#00D4FF" },
  statsRow: {
    flexDirection: "row",
    backgroundColor: "#0D0D18",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#141420",
    marginBottom: 16,
  },
  stat: { flex: 1, alignItems: "center" },
  statVal: { fontSize: 20, fontFamily: "Inter_700Bold", color: "#F0F0FA" },
  statLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "#555578",
    marginTop: 2,
  },
  statDiv: { width: 1, backgroundColor: "#1E1E32" },
  skillsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 16,
  },
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
  skillBadgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  viewToggle: {
    flexDirection: "row",
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: "#141420",
    paddingTop: 12,
    marginBottom: 12,
  },
  toggleBtn: {
    padding: 8,
    borderRadius: 8,
  },
  toggleActive: { backgroundColor: "#12121C" },
  gridList: { paddingHorizontal: 16, gap: 8 },
  feedList: {},
  mini: {
    flex: 1,
    backgroundColor: "#0D0D18",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#141420",
    minHeight: 110,
  },
  miniTop: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 6 },
  miniDot: { width: 5, height: 5, borderRadius: 3 },
  miniDay: { fontSize: 10, fontFamily: "Inter_700Bold" },
  miniContent: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "#888899",
    lineHeight: 16,
    flex: 1,
  },
  miniFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 8,
  },
  miniStat: { fontSize: 10, fontFamily: "Inter_400Regular", color: "#444460", marginRight: 5 },
  emptyPosts: { alignItems: "center", paddingTop: 40, gap: 10 },
  emptyTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#333358" },
  emptyText: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#28283E" },
});
