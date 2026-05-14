import { useAuth } from "@clerk/expo";
import { useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  FlatList,
  View,
  Text,
  StyleSheet,
  Pressable,
  RefreshControl,
  Platform,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useAppContext, Post } from "@/context/AppContext";
import { getSkillColor, getSkillName } from "@/constants/skills";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

function PostCard({ post }: { post: Post }) {
  const { toggleLike } = useAppContext();
  const { userId } = useAuth();
  const router = useRouter();
  const isLiked = userId ? post.likedBy.includes(userId) : false;
  const skillColor = getSkillColor(post.skillTag);

  const handleLike = () => {
    if (!userId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleLike(post.id, userId);
  };

  return (
    <Pressable
      onPress={() => router.push(`/post/${post.id}`)}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <View style={styles.cardHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {post.username.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.username}>@{post.username}</Text>
          <Text style={styles.timeAgo}>{timeAgo(post.createdAt)}</Text>
        </View>
        <View style={[styles.progressBadge, { borderColor: skillColor + "66" }]}>
          <Text style={[styles.progressText, { color: skillColor }]}>
            Day {post.progressDay}
          </Text>
        </View>
      </View>

      <Text style={styles.content}>{post.content}</Text>

      {post.imageUri ? (
        <Image
          source={{ uri: post.imageUri }}
          style={styles.postImage}
          resizeMode="cover"
        />
      ) : null}

      <View style={styles.cardFooter}>
        <View
          style={[
            styles.skillTag,
            { backgroundColor: skillColor + "18", borderColor: skillColor + "55" },
          ]}
        >
          <View style={[styles.skillDot, { backgroundColor: skillColor }]} />
          <Text style={[styles.skillName, { color: skillColor }]}>
            {getSkillName(post.skillTag)}
          </Text>
        </View>

        <View style={styles.actions}>
          <Pressable onPress={handleLike} style={styles.actionBtn}>
            <Feather
              name="heart"
              size={16}
              color={isLiked ? "#FF4444" : "#666688"}
            />
            <Text style={[styles.actionCount, isLiked && styles.likedCount]}>
              {post.likedBy.length}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => router.push(`/post/${post.id}`)}
            style={styles.actionBtn}
          >
            <Feather name="message-circle" size={16} color="#666688" />
            <Text style={styles.actionCount}>{post.commentCount}</Text>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

export default function FeedScreen() {
  const { posts } = useAppContext();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  }, []);

  const HEADER_HEIGHT = 60;

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.header,
          {
            paddingTop:
              insets.top + (Platform.OS === "web" ? 67 : 0),
            height: HEADER_HEIGHT + insets.top + (Platform.OS === "web" ? 67 : 0),
          },
        ]}
      >
        <Text style={styles.headerLogo}>Skillect</Text>
        <Text style={styles.headerTagline}>Progress shared daily</Text>
      </View>

      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <PostCard post={item} />}
        contentContainerStyle={[
          styles.list,
          {
            paddingTop:
              HEADER_HEIGHT +
              insets.top +
              (Platform.OS === "web" ? 67 : 0) +
              8,
            paddingBottom:
              80 + insets.bottom + (Platform.OS === "web" ? 34 : 0),
          },
        ]}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!!posts.length}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#00D4FF"
            colors={["#00D4FF"]}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="activity" size={40} color="#1E1E32" />
            <Text style={styles.emptyTitle}>No posts yet</Text>
            <Text style={styles.emptyText}>
              Be the first to share your progress
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
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: "#0A0A0F",
    borderBottomWidth: 1,
    borderBottomColor: "#1E1E32",
    paddingHorizontal: 20,
    justifyContent: "flex-end",
    paddingBottom: 12,
  },
  headerLogo: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: "#00D4FF",
    letterSpacing: -0.5,
  },
  headerTagline: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "#444460",
    letterSpacing: 0.5,
  },
  list: {
    paddingHorizontal: 16,
    gap: 12,
  },
  card: {
    backgroundColor: "#12121C",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#1E1E32",
  },
  cardPressed: {
    opacity: 0.85,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#1E1E32",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  avatarText: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: "#00D4FF",
  },
  userInfo: {
    flex: 1,
  },
  username: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#F0F0FA",
  },
  timeAgo: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "#444460",
    marginTop: 1,
  },
  progressBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  progressText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
  },
  content: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: "#D0D0E8",
    lineHeight: 22,
    marginBottom: 12,
  },
  postImage: {
    width: "100%",
    height: 200,
    borderRadius: 10,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  skillTag: {
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
  skillName: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  actions: {
    flexDirection: "row",
    gap: 16,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  actionCount: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: "#666688",
  },
  likedCount: {
    color: "#FF4444",
  },
  empty: {
    alignItems: "center",
    paddingTop: 80,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    color: "#444460",
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#333350",
    textAlign: "center",
  },
});
