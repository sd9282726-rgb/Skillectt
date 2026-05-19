import { useAuth } from "@clerk/expo";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  TextInput,
  Platform,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Share,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useAppContext, Comment } from "@/context/AppContext";
import { getSkillColor, getSkillName } from "@/constants/skills";
import { Avatar } from "../(tabs)/index";
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

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { userId } = useAuth();
  const {
    posts,
    toggleLike,
    toggleSave,
    savedPostIds,
    getComments,
    addComment,
    currentUserProfile,
  } = useAppContext();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const post = posts.find((p) => p.id === id);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  const isLiked = userId ? post?.likedBy.includes(userId) ?? false : false;
  const isSaved = savedPostIds.includes(id ?? "");
  const skillColor = post ? getSkillColor(post.skillTag) : C.primary;

  useEffect(() => {
    if (id) {
      getComments(id).then((c) => {
        setComments(c);
        setIsLoading(false);
      });
    }
  }, [id]);

  const handleLike = () => {
    if (!userId || !post) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleLike(post.id);
  };

  const handleSave = () => {
    if (!userId || !post) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleSave(post.id);
  };

  const handleShare = async () => {
    if (!post) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await Share.share({ message: `${post.content}\n\n— @${post.username} on Skillect` });
    } catch {}
  };

  const handleComment = async () => {
    if (!commentText.trim() || !userId || !post || !currentUserProfile) return;
    setIsSending(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await addComment({
      postId: post.id,
      userId,
      username: currentUserProfile.username,
      displayName: currentUserProfile.displayName,
      avatarUri: currentUserProfile.avatarUri,
      content: commentText.trim(),
    });
    const updated = await getComments(post.id);
    setComments(updated);
    setCommentText("");
    setIsSending(false);
  };

  const TOP = 56 + insets.top + (Platform.OS === "web" ? 67 : 0);

  if (!post) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0), height: TOP }]}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color={C.text} />
          </Pressable>
        </View>
        <View style={styles.notFoundWrap}>
          <Text style={styles.notFound}>Post not found</Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0), height: TOP }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={C.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Post</Text>
        <Pressable onPress={handleShare} style={styles.headerAction}>
          <Feather name="share" size={20} color={C.dim} />
        </Pressable>
      </View>

      <FlatList
        data={comments}
        keyExtractor={(i) => i.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.listContent,
          { paddingTop: TOP + 8, paddingBottom: 90 + insets.bottom + (Platform.OS === "web" ? 34 : 0) },
        ]}
        ListHeaderComponent={
          <View style={styles.postBlock}>
            <Pressable
              onPress={() => router.push(`/user/${post.userId}`)}
              style={styles.postHeader}
            >
              <Avatar uri={post.avatarUri} name={post.displayName ?? post.username} size={42} />
              <View style={styles.postUserInfo}>
                <Text style={styles.postDisplayName}>{post.displayName ?? post.username}</Text>
                <Text style={styles.postUsername}>@{post.username} · {timeAgo(post.createdAt)}</Text>
              </View>
              {post.progressDay !== undefined && (
                <View style={[styles.dayBadge, { borderColor: skillColor + "50", backgroundColor: skillColor + "12" }]}>
                  <Text style={[styles.dayText, { color: skillColor }]}>Day {post.progressDay}</Text>
                </View>
              )}
            </Pressable>

            <Text style={styles.content}>{post.content}</Text>

            {post.imageUri ? (
              <Image source={{ uri: post.imageUri }} style={styles.postImg} resizeMode="cover" />
            ) : null}

            <View style={[styles.skillTag, { backgroundColor: skillColor + "14", borderColor: skillColor + "40" }]}>
              <View style={[styles.dot, { backgroundColor: skillColor, shadowColor: skillColor, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 4 }]} />
              <Text style={[styles.skillName, { color: skillColor }]}>{getSkillName(post.skillTag)}</Text>
            </View>

            <View style={styles.actions}>
              <Pressable onPress={handleLike} style={styles.actionBtn}>
                <Feather name="heart" size={20} color={isLiked ? "#FF4466" : C.dim} />
                <Text style={[styles.actionCount, isLiked && { color: "#FF4466" }]}>
                  {post.likedBy.length}
                </Text>
              </Pressable>
              <Pressable style={styles.actionBtn}>
                <Feather name="message-circle" size={20} color={C.dim} />
                <Text style={styles.actionCount}>{comments.length}</Text>
              </Pressable>
              <Pressable onPress={handleSave} style={styles.actionBtn}>
                <Feather name="bookmark" size={20} color={isSaved ? C.primary : C.dim} />
              </Pressable>
              <Pressable onPress={handleShare} style={styles.actionBtn}>
                <Feather name="share" size={20} color={C.dim} />
              </Pressable>
            </View>

            <View style={styles.commentsDivider}>
              <Text style={styles.commentsLabel}>
                {comments.length} Comment{comments.length !== 1 ? "s" : ""}
              </Text>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.comment}>
            <Avatar uri={item.avatarUri} name={item.displayName ?? item.username} size={30} />
            <View style={styles.commentBody}>
              <View style={styles.commentHeader}>
                <Text style={styles.commentName}>{item.displayName ?? item.username}</Text>
                <Text style={styles.commentTime}>{timeAgo(item.createdAt)}</Text>
              </View>
              <Text style={styles.commentText}>{item.content}</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator color={C.primary} style={{ marginTop: 24 }} />
          ) : (
            <View style={styles.noComments}>
              <Feather name="message-circle" size={22} color={C.border2} />
              <Text style={styles.noCommentsText}>No comments yet. Start the conversation.</Text>
            </View>
          )
        }
      />

      <View style={[styles.inputBar, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 8 }]}>
        <TextInput
          style={styles.commentInput}
          placeholder="Add a comment..."
          placeholderTextColor={C.muted}
          value={commentText}
          onChangeText={setCommentText}
          returnKeyType="send"
          onSubmitEditing={handleComment}
        />
        <Pressable
          onPress={handleComment}
          disabled={!commentText.trim() || isSending}
          style={({ pressed }) => [
            styles.sendBtn,
            (!commentText.trim() || isSending) && styles.sendBtnDisabled,
            pressed && { opacity: 0.8 },
          ]}
        >
          {isSending ? (
            <ActivityIndicator color={C.bg} size="small" />
          ) : (
            <Feather name="send" size={15} color={C.bg} />
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
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
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 8,
    paddingBottom: 10,
  },
  backBtn: { padding: 8 },
  headerTitle: { flex: 1, fontSize: 17, fontFamily: "Inter_600SemiBold", color: C.text, textAlign: "center" },
  headerAction: { padding: 8 },
  notFoundWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  notFound: { fontSize: 14, fontFamily: "Inter_400Regular", color: C.dim },
  listContent: { paddingHorizontal: 16 },
  postBlock: { marginBottom: 8 },
  postHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 },
  postUserInfo: { flex: 1 },
  postDisplayName: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: C.text },
  postUsername: { fontSize: 12, fontFamily: "Inter_400Regular", color: C.dim, marginTop: 1 },
  dayBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  dayText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  content: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    color: "#D0D8F0",
    lineHeight: 25,
    marginBottom: 14,
  },
  postImg: { width: "100%", height: 220, borderRadius: 12, marginBottom: 14 },
  skillTag: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    gap: 5,
    alignSelf: "flex-start",
    marginBottom: 16,
  },
  dot: { width: 5, height: 5, borderRadius: 3 },
  skillName: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 22,
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingTop: 14,
    marginBottom: 8,
  },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 7 },
  actionCount: { fontSize: 15, fontFamily: "Inter_500Medium", color: C.dim },
  commentsDivider: { borderTopWidth: 1, borderTopColor: C.border, paddingTop: 14, paddingBottom: 4 },
  commentsLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: C.dim,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  comment: {
    flexDirection: "row",
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  commentBody: { flex: 1 },
  commentHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  commentName: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: C.subtext },
  commentTime: { fontSize: 11, fontFamily: "Inter_400Regular", color: C.dim },
  commentText: { fontSize: 14, fontFamily: "Inter_400Regular", color: "#C8D0E8", lineHeight: 20 },
  noComments: { paddingVertical: 24, alignItems: "center", gap: 8 },
  noCommentsText: { fontSize: 14, fontFamily: "Inter_400Regular", color: C.dim },
  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: C.border,
    backgroundColor: "#040410",
  },
  commentInput: {
    flex: 1,
    backgroundColor: C.card,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: C.text,
    borderWidth: 1,
    borderColor: C.border2,
  },
  sendBtn: {
    backgroundColor: C.primary,
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  sendBtnDisabled: { opacity: 0.35, shadowColor: "transparent" },
});
