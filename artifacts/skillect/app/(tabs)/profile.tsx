import { useAuth, useClerk } from "@clerk/expo";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Platform,
  Alert,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useAppContext, Post } from "@/context/AppContext";
import { getSkillColor, getSkillName, SKILLS } from "@/constants/skills";

function MiniPostCard({ post }: { post: Post }) {
  const router = useRouter();
  const skillColor = getSkillColor(post.skillTag);
  return (
    <Pressable
      onPress={() => router.push(`/post/${post.id}`)}
      style={({ pressed }) => [styles.miniCard, pressed && { opacity: 0.75 }]}
    >
      <View style={styles.miniCardTop}>
        <View
          style={[
            styles.miniSkillDot,
            { backgroundColor: skillColor },
          ]}
        />
        <Text style={[styles.miniDay, { color: skillColor }]}>
          Day {post.progressDay}
        </Text>
      </View>
      <Text style={styles.miniContent} numberOfLines={3}>
        {post.content}
      </Text>
      <View style={styles.miniFooter}>
        <Feather name="heart" size={11} color="#444460" />
        <Text style={styles.miniStat}>{post.likedBy.length}</Text>
        <Feather name="message-circle" size={11} color="#444460" />
        <Text style={styles.miniStat}>{post.commentCount}</Text>
      </View>
    </Pressable>
  );
}

export default function ProfileScreen() {
  const { userId } = useAuth();
  const { signOut } = useClerk();
  const { currentUserProfile, getPostsByUser } = useAppContext();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const userPosts = userId ? getPostsByUser(userId) : [];

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
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
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  const profileSkills = SKILLS.filter((s) =>
    currentUserProfile.skills.includes(s.id)
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={userPosts}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={{ gap: 10 }}
        contentContainerStyle={[
          styles.listContent,
          {
            paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0),
            paddingBottom:
              80 + insets.bottom + (Platform.OS === "web" ? 34 : 0),
          },
        ]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.profileHeader}>
            <View style={styles.topRow}>
              <View style={styles.bigAvatar}>
                <Text style={styles.bigAvatarText}>
                  {currentUserProfile.username.charAt(0).toUpperCase()}
                </Text>
              </View>
              <Pressable onPress={handleSignOut} style={styles.signOutBtn}>
                <Feather name="log-out" size={18} color="#666688" />
              </Pressable>
            </View>

            <Text style={styles.displayName}>
              @{currentUserProfile.username}
            </Text>

            {currentUserProfile.bio ? (
              <Text style={styles.bio}>{currentUserProfile.bio}</Text>
            ) : null}

            <View style={styles.statRow}>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{userPosts.length}</Text>
                <Text style={styles.statLabel}>Posts</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.stat}>
                <Text style={styles.statValue}>
                  {userPosts.reduce((acc, p) => acc + p.likedBy.length, 0)}
                </Text>
                <Text style={styles.statLabel}>Likes</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.stat}>
                <Text style={styles.statValue}>
                  {userPosts.length > 0
                    ? Math.max(...userPosts.map((p) => p.progressDay))
                    : 0}
                </Text>
                <Text style={styles.statLabel}>Best Day</Text>
              </View>
            </View>

            {profileSkills.length > 0 && (
              <View style={styles.skillsRow}>
                {profileSkills.map((s) => (
                  <View
                    key={s.id}
                    style={[
                      styles.skillBadge,
                      {
                        backgroundColor: s.color + "18",
                        borderColor: s.color + "55",
                      },
                    ]}
                  >
                    <View
                      style={[styles.skillDot, { backgroundColor: s.color }]}
                    />
                    <Text style={[styles.skillBadgeText, { color: s.color }]}>
                      {s.name}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>My Posts</Text>
            </View>
          </View>
        }
        renderItem={({ item }) => <MiniPostCard post={item} />}
        ListEmptyComponent={
          <View style={styles.emptyPosts}>
            <Feather name="edit-3" size={32} color="#1E1E32" />
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A0A0F",
  },
  loadingText: {
    color: "#666688",
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    textAlign: "center",
    marginTop: 100,
  },
  listContent: {
    paddingHorizontal: 16,
    gap: 10,
  },
  profileHeader: {
    paddingBottom: 20,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
    marginTop: 16,
  },
  bigAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#1E1E32",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#00D4FF33",
  },
  bigAvatarText: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: "#00D4FF",
  },
  signOutBtn: {
    padding: 8,
  },
  displayName: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: "#F0F0FA",
    marginBottom: 8,
  },
  bio: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#A0A0C0",
    lineHeight: 20,
    marginBottom: 16,
  },
  statRow: {
    flexDirection: "row",
    backgroundColor: "#12121C",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#1E1E32",
    marginBottom: 16,
  },
  stat: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: "#F0F0FA",
  },
  statLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "#666688",
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: "#1E1E32",
  },
  skillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 20,
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
  skillDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  skillBadgeText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  sectionHeader: {
    borderTopWidth: 1,
    borderTopColor: "#1E1E32",
    paddingTop: 20,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#A0A0C0",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  miniCard: {
    flex: 1,
    backgroundColor: "#12121C",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#1E1E32",
    minHeight: 120,
  },
  miniCardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  miniSkillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  miniDay: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
  },
  miniContent: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "#A0A0C0",
    lineHeight: 18,
    flex: 1,
  },
  miniFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 8,
  },
  miniStat: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "#444460",
    marginRight: 6,
  },
  emptyPosts: {
    alignItems: "center",
    paddingTop: 40,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "#444460",
  },
  emptyText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#333350",
  },
});
