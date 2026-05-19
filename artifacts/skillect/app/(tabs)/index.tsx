import { useAuth } from "@clerk/expo";
import { useRouter } from "expo-router";
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  Animated,
  FlatList,
  Image,
  Platform,
  Pressable,
  RefreshControl,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useAppContext, Post } from "@/context/AppContext";
import { getSkillColor, getSkillName } from "@/constants/skills";
import { C } from "@/constants/colors";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export function Avatar({ uri, name, size = 38 }: { uri?: string; name: string; size?: number }) {
  if (uri) {
    return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  }
  const initials = name.split(" ").map((w) => w[0]).join("").substring(0, 2).toUpperCase();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: C.primaryDim,
        borderWidth: 1,
        borderColor: C.primaryBorder,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ fontSize: size * 0.38, fontFamily: "Inter_700Bold", color: C.primary }}>
        {initials}
      </Text>
    </View>
  );
}

function AnimatedPressable({
  children,
  onPress,
  style,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  style?: any;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const press = () => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.96, duration: 80, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();
    onPress?.();
  };
  return (
    <Pressable onPress={press}>
      <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
    </Pressable>
  );
}

function PostCard({ post }: { post: Post }) {
  const { toggleLike, toggleSave, savedPostIds } = useAppContext();
  const { userId } = useAuth();
  const router = useRouter();
  const isLiked = userId ? post.likedBy.includes(userId) : false;
  const isSaved = savedPostIds.includes(post.id);
  const skillColor = getSkillColor(post.skillTag);
  const likeAnim = useRef(new Animated.Value(1)).current;

  const handleLike = () => {
    if (!userId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.sequence([
      Animated.timing(likeAnim, { toValue: 1.3, duration: 100, useNativeDriver: true }),
      Animated.timing(likeAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();
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
      await Share.share({ message: `${post.content}\n\n— @${post.username} on Skillect` });
    } catch {}
  };

  return (
    <Pressable
      onPress={() => router.push(`/post/${post.id}`)}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]}
    >
      <View style={styles.cardInner}>
        <View style={styles.cardHeader}>
          <Pressable onPress={() => router.push(`/user/${post.userId}`)} style={styles.userRow}>
            <Avatar uri={post.avatarUri} name={post.displayName ?? post.username} size={40} />
            <View style={styles.userInfo}>
              <Text style={styles.displayName}>{post.displayName ?? post.username}</Text>
              <View style={styles.metaRow}>
                <Text style={styles.username}>@{post.username}</Text>
                <Text style={styles.dot}> · </Text>
                <Text style={styles.time}>{timeAgo(post.createdAt)}</Text>
              </View>
            </View>
          </Pressable>
          {post.progressDay !== undefined && post.postType === "progress" && (
            <View style={[styles.dayBadge, { borderColor: skillColor + "50", backgroundColor: skillColor + "12" }]}>
              <Text style={[styles.dayText, { color: skillColor }]}>Day {post.progressDay}</Text>
            </View>
          )}
        </View>

        <Text style={styles.content}>{post.content}</Text>

        {post.imageUri ? (
          <Image source={{ uri: post.imageUri }} style={styles.postImage} resizeMode="cover" />
        ) : null}

        <View style={styles.cardFooter}>
          <View style={[styles.skillTag, { backgroundColor: skillColor + "14", borderColor: skillColor + "40" }]}>
            <View style={[styles.skillDot, { backgroundColor: skillColor, shadowColor: skillColor, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 4 }]} />
            <Text style={[styles.skillName, { color: skillColor }]}>{getSkillName(post.skillTag)}</Text>
          </View>

          <View style={styles.actions}>
            <Pressable onPress={handleLike} style={styles.action}>
              <Animated.View style={{ transform: [{ scale: likeAnim }] }}>
                <Feather name="heart" size={16} color={isLiked ? "#FF4466" : C.dim} />
              </Animated.View>
              <Text style={[styles.actionNum, isLiked && { color: "#FF4466" }]}>
                {post.likedBy.length}
              </Text>
            </Pressable>
            <Pressable onPress={() => router.push(`/post/${post.id}`)} style={styles.action}>
              <Feather name="message-circle" size={16} color={C.dim} />
              <Text style={styles.actionNum}>{post.commentCount}</Text>
            </Pressable>
            <Pressable onPress={handleSave} style={styles.action}>
              <Feather name="bookmark" size={16} color={isSaved ? C.primary : C.dim} />
            </Pressable>
            <Pressable onPress={handleShare} style={styles.action}>
              <Feather name="share" size={16} color={C.dim} />
            </Pressable>
          </View>
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
    setTimeout(() => setRefreshing(false), 700);
  }, []);

  const TOP = 52 + insets.top + (Platform.OS === "web" ? 67 : 0);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0), height: TOP }]}>
        <View>
          <Text style={styles.logo}>Skillect</Text>
          <Text style={styles.logoSub}>your builder feed</Text>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>Live</Text>
        </View>
      </View>

      <FlatList
        data={feed}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => <PostCard post={item} />}
        contentContainerStyle={[
          styles.list,
          { paddingTop: TOP + 8, paddingBottom: 100 + insets.bottom + (Platform.OS === "web" ? 34 : 0) },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={C.primary}
            colors={[C.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyGlow}>
              <Feather name="activity" size={28} color={C.primary} />
            </View>
            <Text style={styles.emptyTitle}>Your feed is empty</Text>
            <Text style={styles.emptyText}>Follow builders and post your first update</Text>
          </View>
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
    paddingHorizontal: 20,
    justifyContent: "flex-end",
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between" as any,
  },
  logo: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: C.primary,
    letterSpacing: -0.5,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  logoSub: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    color: C.dim,
    letterSpacing: 0.5,
    marginTop: 1,
  },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 2 },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: C.primary,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 6,
  },
  liveText: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: C.primary },
  list: { gap: 1 },
  card: {
    backgroundColor: C.card,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  cardInner: { paddingHorizontal: 16, paddingVertical: 16 },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  userRow: { flexDirection: "row", alignItems: "center", flex: 1 },
  userInfo: { marginLeft: 10, flex: 1 },
  displayName: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: C.text },
  metaRow: { flexDirection: "row", alignItems: "center", marginTop: 1 },
  username: { fontSize: 12, fontFamily: "Inter_400Regular", color: C.dim },
  dot: { fontSize: 12, color: C.dim },
  time: { fontSize: 12, fontFamily: "Inter_400Regular", color: C.dim },
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
    color: "#D0D8F0",
    lineHeight: 23,
    marginBottom: 12,
  },
  postImage: { width: "100%", height: 200, borderRadius: 12, marginBottom: 12 },
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
    paddingVertical: 4,
    borderWidth: 1,
    gap: 5,
  },
  skillDot: { width: 5, height: 5, borderRadius: 3 },
  skillName: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  actions: { flexDirection: "row", gap: 16 },
  action: { flexDirection: "row", alignItems: "center", gap: 5 },
  actionNum: { fontSize: 13, fontFamily: "Inter_500Medium", color: C.dim },
  empty: { alignItems: "center", paddingTop: 100, gap: 12 },
  emptyGlow: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: C.primaryDim,
    borderWidth: 1,
    borderColor: C.primaryBorder,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", color: C.subtext },
  emptyText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: C.dim,
    textAlign: "center",
    paddingHorizontal: 40,
    lineHeight: 19,
  },
});
