import { useAuth } from "@clerk/expo";
import { useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  FlatList,
  View,
  Text,
  StyleSheet,
  Pressable,
  RefreshControl,
  Platform,
  Image,
  Share,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useAppContext, Post } from "@/context/AppContext";
import { getSkillColor, getSkillName } from "@/constants/skills";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function Avatar({
  uri,
  name,
  size = 38,
}: {
  uri?: string;
  name: string;
  size?: number;
}) {
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
      />
    );
  }
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: "#1E1E32",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text
        style={{
          fontSize: size * 0.42,
          fontFamily: "Inter_700Bold",
          color: "#00D4FF",
        }}
      >
        {name.charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}

export { Avatar };

function PostCard({ post }: { post: Post }) {
  const { toggleLike, toggleSave, savedPostIds } = useAppContext();
  const { userId } = useAuth();
  const router = useRouter();
  const isLiked = userId ? post.likedBy.includes(userId) : false;
  const isSaved = savedPostIds.includes(post.id);
  const skillColor = getSkillColor(post.skillTag);

  const handleLike = () => {
    if (!userId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleLike(post.id);
  };

  const handleSave = () => {
    if (!userId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleSave(post.id);
  };

  const handleShare = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await Share.share({
        message: `${post.content}\n\n— @${post.username} on Skillect`,
      });
    } catch {}
  };

  return (
    <Pressable
      onPress={() => router.push(`/post/${post.id}`)}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <View style={styles.cardHeader}>
        <Pressable
          onPress={() => router.push(`/user/${post.userId}`)}
          style={styles.userRow}
        >
          <Avatar
            uri={post.avatarUri}
            name={post.displayName ?? post.username}
            size={38}
          />
          <View style={styles.userInfo}>
            <Text style={styles.displayName}>
              {post.displayName ?? post.username}
            </Text>
            <Text style={styles.username}>@{post.username}</Text>
          </View>
        </Pressable>
        {post.progressDay !== undefined && post.postType === "progress" && (
          <View style={[styles.dayBadge, { borderColor: skillColor + "55" }]}>
            <Text style={[styles.dayText, { color: skillColor }]}>
              Day {post.progressDay}
            </Text>
          </View>
        )}
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
            {
              backgroundColor: skillColor + "16",
              borderColor: skillColor + "44",
            },
          ]}
        >
          <View style={[styles.dot, { backgroundColor: skillColor }]} />
          <Text style={[styles.skillName, { color: skillColor }]}>
            {getSkillName(post.skillTag)}
          </Text>
        </View>

        <View style={styles.actions}>
          <Pressable onPress={handleLike} style={styles.action}>
            <Feather
              name="heart"
              size={16}
              color={isLiked ? "#FF4444" : "#555578"}
            />
            <Text style={[styles.actionNum, isLiked && { color: "#FF4444" }]}>
              {post.likedBy.length}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => router.push(`/post/${post.id}`)}
            style={styles.action}
          >
            <Feather name="message-circle" size={16} color="#555578" />
            <Text style={styles.actionNum}>{post.commentCount}</Text>
          </Pressable>
          <Pressable onPress={handleSave} style={styles.action}>
            <Feather
              name="bookmark"
              size={16}
              color={isSaved ? "#00D4FF" : "#555578"}
            />
          </Pressable>
          <Pressable onPress={handleShare} style={styles.action}>
            <Feather name="share" size={16} color="#555578" />
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

export default function FeedScreen() {
  const { getFeedPosts } = useAppContext();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [tick, setTick] = useState(0);

  const feed = useMemo(() => getFeedPosts(), [getFeedPosts, tick]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTick((t) => t + 1);
    setTimeout(() => setRefreshing(false), 600);
  }, []);

  const TOP =
    52 + insets.top + (Platform.OS === "web" ? 67 : 0);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0), height: TOP }]}>
        <Text style={styles.logo}>Skillect</Text>
        <Text style={styles.logoSub}>your builder feed</Text>
      </View>

      <FlatList
        data={feed}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => <PostCard post={item} />}
        contentContainerStyle={[
          styles.list,
          {
            paddingTop: TOP + 8,
            paddingBottom: 90 + insets.bottom + (Platform.OS === "web" ? 34 : 0),
          },
        ]}
        showsVerticalScrollIndicator={false}
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
            <Feather name="activity" size={36} color="#1E1E32" />
            <Text style={styles.emptyTitle}>Nothing here yet</Text>
            <Text style={styles.emptyText}>
              Follow people or post your first update
            </Text>
          </View>
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
    paddingHorizontal: 20,
    justifyContent: "flex-end",
    paddingBottom: 10,
  },
  logo: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: "#00D4FF",
    letterSpacing: -0.5,
  },
  logoSub: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    color: "#333358",
    letterSpacing: 0.5,
    textTransform: "lowercase",
  },
  list: { paddingHorizontal: 0, gap: 1 },
  card: {
    backgroundColor: "#0D0D18",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#141420",
  },
  cardPressed: { opacity: 0.88 },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  userRow: { flexDirection: "row", alignItems: "center", flex: 1 },
  userInfo: { marginLeft: 10, flex: 1 },
  displayName: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#F0F0FA",
  },
  username: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "#555578",
    marginTop: 1,
  },
  dayBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  dayText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  content: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: "#C8C8E0",
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
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderWidth: 1,
    gap: 5,
  },
  dot: { width: 5, height: 5, borderRadius: 3 },
  skillName: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  actions: { flexDirection: "row", gap: 14 },
  action: { flexDirection: "row", alignItems: "center", gap: 5 },
  actionNum: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: "#555578",
  },
  empty: { alignItems: "center", paddingTop: 80, gap: 10 },
  emptyTitle: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    color: "#333358",
  },
  emptyText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#28283E",
    textAlign: "center",
    paddingHorizontal: 40,
  },
});
