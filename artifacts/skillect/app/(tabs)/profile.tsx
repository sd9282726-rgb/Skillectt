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
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useAppContext, Post, UserProfile, Project } from "@/context/AppContext";
import { getSkillColor, getSkillName, SKILLS } from "@/constants/skills";
import { Avatar } from "./index";
import { C } from "@/constants/colors";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const d = Math.floor(diff / 86400000);
  if (d < 1) return "today";
  if (d === 1) return "1d ago";
  if (d < 30) return `${d}d ago`;
  return `${Math.floor(d / 30)}mo ago`;
}

function MiniPost({ post }: { post: Post }) {
  const router = useRouter();
  const c = getSkillColor(post.skillTag);
  return (
    <Pressable
      onPress={() => router.push(`/post/${post.id}`)}
      style={({ pressed }) => [styles.mini, { borderColor: c + "20" }, pressed && { opacity: 0.75 }]}
    >
      <View style={styles.miniTop}>
        <View style={[styles.miniDot, { backgroundColor: c, shadowColor: c, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 4 }]} />
        <Text style={[styles.miniLabel, { color: c }]}>
          {post.progressDay ? `Day ${post.progressDay}` : getSkillName(post.skillTag)}
        </Text>
      </View>
      <Text style={styles.miniContent} numberOfLines={3}>{post.content}</Text>
      <View style={styles.miniFooter}>
        <Feather name="heart" size={10} color={C.dim} />
        <Text style={styles.miniStat}>{post.likedBy.length}</Text>
        <Feather name="message-circle" size={10} color={C.dim} />
        <Text style={styles.miniStat}>{post.commentCount}</Text>
      </View>
    </Pressable>
  );
}

function ProjectCard({ project }: { project: Project }) {
  const { toggleProjectLike } = useAppContext();
  const { userId } = useAuth();
  const isLiked = userId ? project.likedBy.includes(userId) : false;

  const statusColor = project.status === "launched" ? C.primary : project.status === "building" ? C.neonBlue : C.dim;
  const statusLabel = project.status === "launched" ? "Launched" : project.status === "building" ? "Building" : "Paused";

  return (
    <View style={styles.projectCard}>
      <View style={styles.projectHeader}>
        <View style={styles.projectTitleRow}>
          <Text style={styles.projectTitle}>{project.title}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + "18", borderColor: statusColor + "40" }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
          </View>
        </View>
        <Text style={styles.projectDesc}>{project.description}</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.techRow}>
        {project.techStack.map((tech) => (
          <View key={tech} style={styles.techChip}>
            <Text style={styles.techText}>{tech}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.projectFooter}>
        <Text style={styles.projectDate}>{timeAgo(project.createdAt)}</Text>
        <View style={styles.projectActions}>
          {project.liveUrl ? (
            <View style={styles.projectLink}>
              <Feather name="external-link" size={13} color={C.primary} />
              <Text style={styles.projectLinkText}>Live</Text>
            </View>
          ) : null}
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              toggleProjectLike(project.id);
            }}
            style={styles.likeAction}
          >
            <Feather name="heart" size={14} color={isLiked ? "#FF4466" : C.dim} />
            <Text style={[styles.likeNum, isLiked && { color: "#FF4466" }]}>{project.likedBy.length}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

type ViewTab = "posts" | "projects";

export default function ProfileScreen() {
  const { userId } = useAuth();
  const { signOut } = useClerk();
  const { currentUserProfile, getPostsByUser, getFollowerCount, getFollowingCount, getProjectsByUser } = useAppContext();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [viewTab, setViewTab] = useState<ViewTab>("posts");

  const userPosts = userId ? getPostsByUser(userId) : [];
  const userProjects = userId ? getProjectsByUser(userId) : [];

  useEffect(() => {
    if (userId) {
      getFollowerCount(userId).then(setFollowerCount);
      getFollowingCount(userId).then(setFollowingCount);
    }
  }, [userId, currentUserProfile]);

  const handleSignOut = () => {
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
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
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  const profileSkills = SKILLS.filter((s) => currentUserProfile.skills.includes(s.id));
  const TOP = insets.top + (Platform.OS === "web" ? 67 : 0);

  const Header = (
    <View style={[styles.profileBlock, { paddingTop: TOP + 16 }]}>
      <View style={styles.profileTopRow}>
        <View style={styles.avatarGlow}>
          <Avatar uri={currentUserProfile.avatarUri} name={currentUserProfile.displayName} size={76} />
        </View>
        <View style={styles.headerActions}>
          <Pressable
            onPress={() => router.push("/(tabs)/messages" as any)}
            style={styles.iconBtn}
          >
            <Feather name="message-circle" size={20} color={C.subtext} />
          </Pressable>
          <Pressable onPress={() => router.push("/edit-profile")} style={styles.editBtn}>
            <Feather name="edit-2" size={13} color={C.text} />
            <Text style={styles.editBtnText}>Edit</Text>
          </Pressable>
          <Pressable onPress={handleSignOut} style={styles.iconBtn}>
            <Feather name="log-out" size={18} color={C.dim} />
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
          <Feather name="tool" size={12} color={C.primary} />
          <Text style={styles.buildingText}>Building: {currentUserProfile.currentlyBuilding}</Text>
        </View>
      ) : null}

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statVal}>{userPosts.length + userProjects.length}</Text>
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
        <View style={styles.statDiv} />
        <View style={styles.stat}>
          <Text style={styles.statVal}>{userProjects.length}</Text>
          <Text style={styles.statLabel}>Projects</Text>
        </View>
      </View>

      {profileSkills.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.skillsWrap}>
          {profileSkills.map((s) => (
            <View
              key={s.id}
              style={[styles.skillBadge, { backgroundColor: s.color + "14", borderColor: s.color + "40" }]}
            >
              <View style={[styles.dot, { backgroundColor: s.color, shadowColor: s.color, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 4 }]} />
              <Text style={[styles.skillBadgeText, { color: s.color }]}>{s.name}</Text>
            </View>
          ))}
        </ScrollView>
      )}

      <View style={styles.tabBar}>
        {([["posts", "Grid"], ["projects", "Projects"]] as [ViewTab, string][]).map(([tab, label]) => (
          <Pressable
            key={tab}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setViewTab(tab);
            }}
            style={[styles.tabBtn, viewTab === tab && styles.tabBtnActive]}
          >
            <Feather
              name={tab === "posts" ? "grid" : "layers"}
              size={15}
              color={viewTab === tab ? C.primary : C.dim}
            />
            <Text style={[styles.tabBtnText, viewTab === tab && styles.tabBtnTextActive]}>{label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );

  if (viewTab === "projects") {
    return (
      <View style={styles.container}>
        <FlatList
          data={userProjects}
          keyExtractor={(i) => i.id}
          contentContainerStyle={[styles.projectsList, { paddingBottom: 100 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={Header}
          renderItem={({ item }) => <ProjectCard project={item} />}
          ListEmptyComponent={
            <View style={styles.emptyPosts}>
              <Feather name="layers" size={28} color={C.border2} />
              <Text style={styles.emptyTitle}>No projects yet</Text>
              <Text style={styles.emptyText}>Showcase what you're building</Text>
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
        numColumns={2}
        columnWrapperStyle={{ gap: 8 }}
        contentContainerStyle={[styles.gridList, { paddingBottom: 100 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={Header}
        renderItem={({ item }) => <MiniPost post={item} />}
        ListEmptyComponent={
          <View style={styles.emptyPosts}>
            <Feather name="edit-3" size={28} color={C.border2} />
            <Text style={styles.emptyTitle}>No posts yet</Text>
            <Text style={styles.emptyText}>Share your first progress update</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  loadingText: { color: C.dim, fontFamily: "Inter_400Regular", fontSize: 14 },
  profileBlock: { paddingHorizontal: 16, paddingBottom: 0 },
  profileTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  avatarGlow: {
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
  },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: C.cardAlt,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: C.border2,
  },
  editBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: C.text },
  iconBtn: { padding: 8 },
  displayName: { fontSize: 21, fontFamily: "Inter_700Bold", color: C.text, marginBottom: 2 },
  username: { fontSize: 13, fontFamily: "Inter_400Regular", color: C.dim, marginBottom: 10 },
  bio: { fontSize: 14, fontFamily: "Inter_400Regular", color: C.subtext, lineHeight: 21, marginBottom: 12 },
  buildingRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 16 },
  buildingText: { fontSize: 13, fontFamily: "Inter_500Medium", color: C.primary },
  statsRow: {
    flexDirection: "row",
    backgroundColor: C.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 16,
  },
  stat: { flex: 1, alignItems: "center" },
  statVal: {
    fontSize: 19,
    fontFamily: "Inter_700Bold",
    color: C.text,
  },
  statLabel: { fontSize: 11, fontFamily: "Inter_400Regular", color: C.dim, marginTop: 2 },
  statDiv: { width: 1, backgroundColor: C.border },
  skillsWrap: { flexDirection: "row", gap: 7, marginBottom: 16 },
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
  tabBar: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: C.border,
    marginTop: 4,
    marginBottom: 0,
  },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingVertical: 14,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabBtnActive: {
    borderBottomColor: C.primary,
  },
  tabBtnText: { fontSize: 13, fontFamily: "Inter_500Medium", color: C.dim },
  tabBtnTextActive: { color: C.primary, fontFamily: "Inter_600SemiBold" },
  gridList: { paddingHorizontal: 16, gap: 8 },
  projectsList: { paddingHorizontal: 16, gap: 12 },
  mini: {
    flex: 1,
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    minHeight: 110,
  },
  miniTop: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 6 },
  miniDot: { width: 5, height: 5, borderRadius: 3 },
  miniLabel: { fontSize: 10, fontFamily: "Inter_700Bold" },
  miniContent: { fontSize: 11, fontFamily: "Inter_400Regular", color: C.subtext, lineHeight: 16, flex: 1 },
  miniFooter: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 8 },
  miniStat: { fontSize: 10, fontFamily: "Inter_400Regular", color: C.dim, marginRight: 5 },
  projectCard: {
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    overflow: "hidden",
  },
  projectHeader: { padding: 16, paddingBottom: 10 },
  projectTitleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  projectTitle: { fontSize: 16, fontFamily: "Inter_700Bold", color: C.text, flex: 1, marginRight: 8 },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
  },
  statusDot: { width: 5, height: 5, borderRadius: 3 },
  statusText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  projectDesc: { fontSize: 13, fontFamily: "Inter_400Regular", color: C.subtext, lineHeight: 19 },
  techRow: { flexDirection: "row", gap: 7, paddingHorizontal: 16, paddingBottom: 12 },
  techChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: C.border,
    borderWidth: 1,
    borderColor: C.border2,
  },
  techText: { fontSize: 11, fontFamily: "Inter_500Medium", color: C.subtext },
  projectFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  projectDate: { fontSize: 11, fontFamily: "Inter_400Regular", color: C.dim },
  projectActions: { flexDirection: "row", alignItems: "center", gap: 14 },
  projectLink: { flexDirection: "row", alignItems: "center", gap: 4 },
  projectLinkText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: C.primary },
  likeAction: { flexDirection: "row", alignItems: "center", gap: 5 },
  likeNum: { fontSize: 13, fontFamily: "Inter_500Medium", color: C.dim },
  emptyPosts: { alignItems: "center", paddingTop: 40, gap: 10 },
  emptyTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: C.dim },
  emptyText: { fontSize: 13, fontFamily: "Inter_400Regular", color: C.border2 },
});
