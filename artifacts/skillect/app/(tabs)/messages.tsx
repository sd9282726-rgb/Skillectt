import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useAppContext, Conversation } from "@/context/AppContext";
import { Avatar } from "./index";
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

export default function MessagesScreen() {
  const { getConversations } = useAppContext();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getConversations().then((c) => {
      setConvs(c);
      setLoading(false);
    });
  }, []);

  const TOP = 52 + insets.top + (Platform.OS === "web" ? 67 : 0);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0), height: TOP }]}>
        <Text style={styles.headerTitle}>Messages</Text>
        <View style={styles.headerDot}>
          <Text style={styles.headerDotText}>{convs.length}</Text>
        </View>
      </View>

      <FlatList
        data={convs}
        keyExtractor={(i) => i.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.list,
          { paddingTop: TOP + 8, paddingBottom: 100 + insets.bottom + (Platform.OS === "web" ? 34 : 0) },
        ]}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/messages/${item.otherUserId}`)}
            style={({ pressed }) => [styles.row, pressed && { backgroundColor: C.cardAlt }]}
          >
            <View style={styles.avatarWrap}>
              <Avatar uri={item.otherAvatarUri} name={item.otherDisplayName} size={50} />
              <View style={styles.onlineDot} />
            </View>
            <View style={styles.rowInfo}>
              <View style={styles.rowTop}>
                <Text style={styles.rowName}>{item.otherDisplayName}</Text>
                <Text style={styles.rowTime}>{timeAgo(item.lastMessageTime)}</Text>
              </View>
              <Text style={styles.rowHandle}>@{item.otherUsername}</Text>
              <Text style={styles.rowLast} numberOfLines={1}>{item.lastMessage}</Text>
            </View>
            {item.unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>{item.unreadCount}</Text>
              </View>
            )}
          </Pressable>
        )}
        ListEmptyComponent={
          loading ? null : (
            <View style={styles.empty}>
              <View style={styles.emptyGlow}>
                <Feather name="message-circle" size={28} color={C.primary} />
              </View>
              <Text style={styles.emptyTitle}>No messages yet</Text>
              <Text style={styles.emptyText}>
                Find someone on Explore and start a conversation
              </Text>
              <Pressable
                onPress={() => router.replace("/(tabs)/explore")}
                style={styles.exploreBtn}
              >
                <Text style={styles.exploreBtnText}>Go to Explore</Text>
              </Pressable>
            </View>
          )
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
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "flex-end",
  },
  headerTitle: { fontSize: 22, fontFamily: "Inter_700Bold", color: C.text, flex: 1 },
  headerDot: {
    backgroundColor: C.primaryDim,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: C.primaryBorder,
    marginBottom: 2,
  },
  headerDotText: { fontSize: 12, fontFamily: "Inter_700Bold", color: C.primary },
  list: {},
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    gap: 12,
  },
  avatarWrap: { position: "relative" },
  onlineDot: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: C.primary,
    borderWidth: 2,
    borderColor: C.bg,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  rowInfo: { flex: 1 },
  rowTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 2 },
  rowName: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: C.text },
  rowTime: { fontSize: 11, fontFamily: "Inter_400Regular", color: C.dim },
  rowHandle: { fontSize: 12, fontFamily: "Inter_400Regular", color: C.dim, marginBottom: 3 },
  rowLast: { fontSize: 13, fontFamily: "Inter_400Regular", color: C.subtext },
  unreadBadge: {
    backgroundColor: C.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
  },
  unreadText: { fontSize: 11, fontFamily: "Inter_700Bold", color: C.bg },
  empty: { alignItems: "center", paddingTop: 80, gap: 14, paddingHorizontal: 40 },
  emptyGlow: {
    width: 72,
    height: 72,
    borderRadius: 36,
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
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", color: C.dim, textAlign: "center", lineHeight: 21 },
  exploreBtn: {
    marginTop: 4,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: C.primary,
    borderRadius: 20,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  exploreBtnText: { fontSize: 14, fontFamily: "Inter_700Bold", color: C.bg },
});
