import { useAuth } from "@clerk/expo";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useAppContext, Comment, Post } from "@/context/AppContext";
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

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { userId } = useAuth();
  const { posts, toggleLike, getComments, addComment, currentUserProfile } =
    useAppContext();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const post = posts.find((p) => p.id === id);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  const isLiked = userId ? post?.likedBy.includes(userId) ?? false : false;
  const skillColor = post ? getSkillColor(post.skillTag) : "#00D4FF";

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
    toggleLike(post.id, userId);
  };

  const handleComment = async () => {
    if (!commentText.trim() || !userId || !post || !currentUserProfile) return;
    setIsSending(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    await addComment({
      postId: post.id,
      userId,
      username: currentUserProfile.username,
      content: commentText.trim(),
    });

    const updated = await getComments(post.id);
    setComments(updated);
    setCommentText("");
    setIsSending(false);
  };

  if (!post) {
    return (
      <View style={styles.container}>
        <Text style={styles.notFound}>Post not found</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
    >
      <View
        style={[
          styles.topBar,
          {
            paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0),
            height: 56 + insets.top + (Platform.OS === "web" ? 67 : 0),
          },
        ]}
      >
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color="#F0F0FA" />
        </Pressable>
        <Text style={styles.topBarTitle}>Post</Text>
        <View style={{ width: 38 }} />
      </View>

      <FlatList
        data={comments}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.listContent,
          {
            paddingTop:
              56 + insets.top + (Platform.OS === "web" ? 67 : 0) + 8,
            paddingBottom: 100,
          },
        ]}
        ListHeaderComponent={
          <View style={styles.postBlock}>
            <View style={styles.postHeader}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {post.username.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.username}>@{post.username}</Text>
                <Text style={styles.timeAgo}>{timeAgo(post.createdAt)}</Text>
              </View>
              <View
                style={[
                  styles.progressBadge,
                  { borderColor: skillColor + "66" },
                ]}
              >
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

            <View
              style={[
                styles.skillTag,
                {
                  backgroundColor: skillColor + "18",
                  borderColor: skillColor + "55",
                },
              ]}
            >
              <View
                style={[styles.skillDot, { backgroundColor: skillColor }]}
              />
              <Text style={[styles.skillName, { color: skillColor }]}>
                {getSkillName(post.skillTag)}
              </Text>
            </View>

            <View style={styles.likeRow}>
              <Pressable onPress={handleLike} style={styles.likeBtn}>
                <Feather
                  name="heart"
                  size={20}
                  color={isLiked ? "#FF4444" : "#666688"}
                />
                <Text
                  style={[styles.likeCount, isLiked && styles.likedCount]}
                >
                  {post.likedBy.length}
                </Text>
              </Pressable>
            </View>

            <View style={styles.commentsDivider}>
              <Text style={styles.commentsTitle}>
                Comments ({comments.length})
              </Text>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.comment}>
            <View style={styles.commentAvatar}>
              <Text style={styles.commentAvatarText}>
                {item.username.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.commentBody}>
              <View style={styles.commentHeader}>
                <Text style={styles.commentUsername}>@{item.username}</Text>
                <Text style={styles.commentTime}>{timeAgo(item.createdAt)}</Text>
              </View>
              <Text style={styles.commentText}>{item.content}</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator
              color="#00D4FF"
              style={{ marginTop: 24 }}
            />
          ) : (
            <View style={styles.noComments}>
              <Text style={styles.noCommentsText}>
                No comments yet. Be the first.
              </Text>
            </View>
          )
        }
      />

      <View
        style={[
          styles.inputBar,
          {
            paddingBottom:
              insets.bottom + (Platform.OS === "web" ? 34 : 0) + 8,
          },
        ]}
      >
        <TextInput
          style={styles.commentInput}
          placeholder="Add a comment..."
          placeholderTextColor="#444460"
          value={commentText}
          onChangeText={setCommentText}
          multiline={false}
          returnKeyType="send"
          onSubmitEditing={handleComment}
        />
        <Pressable
          onPress={handleComment}
          disabled={!commentText.trim() || isSending}
          style={({ pressed }) => [
            styles.sendBtn,
            (!commentText.trim() || isSending) && styles.sendBtnDisabled,
            pressed && styles.sendBtnPressed,
          ]}
        >
          {isSending ? (
            <ActivityIndicator color="#0A0A0F" size="small" />
          ) : (
            <Feather name="send" size={16} color="#0A0A0F" />
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A0A0F",
  },
  notFound: {
    color: "#666688",
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    textAlign: "center",
    marginTop: 100,
  },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: "#0A0A0F",
    borderBottomWidth: 1,
    borderBottomColor: "#1E1E32",
  },
  backBtn: {
    padding: 8,
    marginRight: 8,
  },
  topBarTitle: {
    flex: 1,
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    color: "#F0F0FA",
    textAlign: "center",
  },
  listContent: {
    paddingHorizontal: 16,
  },
  postBlock: {
    marginBottom: 8,
  },
  postHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#1E1E32",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  avatarText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: "#00D4FF",
  },
  userInfo: {
    flex: 1,
  },
  username: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#F0F0FA",
  },
  timeAgo: {
    fontSize: 12,
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
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    color: "#D0D0E8",
    lineHeight: 24,
    marginBottom: 14,
  },
  postImage: {
    width: "100%",
    height: 220,
    borderRadius: 12,
    marginBottom: 14,
  },
  skillTag: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    gap: 6,
    alignSelf: "flex-start",
    marginBottom: 16,
  },
  skillDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  skillName: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  likeRow: {
    borderTopWidth: 1,
    borderTopColor: "#1E1E32",
    paddingTop: 14,
    marginBottom: 8,
  },
  likeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  likeCount: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: "#666688",
  },
  likedCount: {
    color: "#FF4444",
  },
  commentsDivider: {
    borderTopWidth: 1,
    borderTopColor: "#1E1E32",
    paddingTop: 16,
    paddingBottom: 8,
  },
  commentsTitle: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: "#666688",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  comment: {
    flexDirection: "row",
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1A1A28",
  },
  commentAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#1E1E32",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  commentAvatarText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    color: "#00D4FF",
  },
  commentBody: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 3,
  },
  commentUsername: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: "#A0A0C0",
  },
  commentTime: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "#444460",
  },
  commentText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#D0D0E8",
    lineHeight: 20,
  },
  noComments: {
    paddingVertical: 24,
    alignItems: "center",
  },
  noCommentsText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#444460",
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#1E1E32",
    backgroundColor: "#0A0A0F",
  },
  commentInput: {
    flex: 1,
    backgroundColor: "#12121C",
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#F0F0FA",
    borderWidth: 1,
    borderColor: "#1E1E32",
  },
  sendBtn: {
    backgroundColor: "#00D4FF",
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: {
    opacity: 0.35,
  },
  sendBtnPressed: {
    opacity: 0.8,
  },
});
