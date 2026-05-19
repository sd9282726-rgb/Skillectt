import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useAppContext, Community } from "@/context/AppContext";
import { C } from "@/constants/colors";

function CommunityCard({ community }: { community: Community }) {
  const { isMemberOf, joinCommunity, leaveCommunity } = useAppContext();
  const joined = isMemberOf(community.id);

  const handleToggle = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (joined) await leaveCommunity(community.id);
    else await joinCommunity(community.id);
  };

  return (
    <View style={[styles.card, { borderColor: community.color + "25" }]}>
      <View style={[styles.cardAccent, { backgroundColor: community.color + "18" }]}>
        <View style={[styles.emojiWrap, { backgroundColor: community.color + "22", borderColor: community.color + "40" }]}>
          <Text style={styles.emoji}>{community.emoji}</Text>
        </View>
        <View style={styles.cardTop}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardName}>{community.name}</Text>
            <View style={[styles.memberBadge, { backgroundColor: community.color + "18" }]}>
              <Feather name="users" size={10} color={community.color} />
              <Text style={[styles.memberCount, { color: community.color }]}>
                {community.memberCount.toLocaleString("en-IN")}
              </Text>
            </View>
          </View>
          <Text style={styles.cardDesc} numberOfLines={2}>
            {community.description}
          </Text>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.topicsRow}>
          {community.topics.map((t) => (
            <View key={t} style={[styles.topic, { backgroundColor: community.color + "12", borderColor: community.color + "30" }]}>
              <Text style={[styles.topicText, { color: community.color }]}>#{t}</Text>
            </View>
          ))}
        </ScrollView>
        <Pressable
          onPress={handleToggle}
          style={({ pressed }) => [
            styles.joinBtn,
            joined && styles.joinedBtn,
            { borderColor: community.color + (joined ? "50" : "CC") },
            !joined && { backgroundColor: community.color },
            pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
          ]}
        >
          {joined ? (
            <>
              <Feather name="check" size={13} color={community.color} />
              <Text style={[styles.joinedText, { color: community.color }]}>Joined</Text>
            </>
          ) : (
            <Text style={styles.joinText}>Join</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

function StatsBar() {
  const { communities, joinedCommunityIds } = useAppContext();
  const totalMembers = communities.reduce((acc, c) => acc + c.memberCount, 0);

  return (
    <View style={styles.statsBar}>
      <View style={styles.statItem}>
        <Text style={styles.statNum}>{communities.length}</Text>
        <Text style={styles.statLabel}>Communities</Text>
      </View>
      <View style={styles.statDivider} />
      <View style={styles.statItem}>
        <Text style={styles.statNum}>{(totalMembers / 1000).toFixed(0)}k+</Text>
        <Text style={styles.statLabel}>Members</Text>
      </View>
      <View style={styles.statDivider} />
      <View style={styles.statItem}>
        <Text style={styles.statNum}>{joinedCommunityIds.length}</Text>
        <Text style={styles.statLabel}>Joined</Text>
      </View>
    </View>
  );
}

export default function CommunitiesScreen() {
  const { communities } = useAppContext();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<"all" | "joined">("all");
  const { joinedCommunityIds } = useAppContext();

  const displayed =
    filter === "joined"
      ? communities.filter((c) => joinedCommunityIds.includes(c.id))
      : communities;

  const TOP = 52 + insets.top + (Platform.OS === "web" ? 67 : 0);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0), height: TOP }]}>
        <Text style={styles.headerTitle}>Communities</Text>
        <Text style={styles.headerSub}>Find your people</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: TOP + 12, paddingBottom: 100 + insets.bottom },
        ]}
      >
        <StatsBar />

        <View style={styles.filterRow}>
          {(["all", "joined"] as const).map((f) => (
            <Pressable
              key={f}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setFilter(f);
              }}
              style={[styles.filterChip, filter === f && styles.filterChipActive]}
            >
              <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
                {f === "all" ? "All Groups" : "Joined"}
              </Text>
            </Pressable>
          ))}
        </View>

        {displayed.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Feather name="users" size={28} color={C.dim} />
            </View>
            <Text style={styles.emptyTitle}>No communities joined yet</Text>
            <Text style={styles.emptyText}>
              Join a group to connect with builders who share your interests
            </Text>
            <Pressable onPress={() => setFilter("all")} style={styles.emptyBtn}>
              <Text style={styles.emptyBtnText}>Browse All</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.list}>
            {displayed.map((c) => (
              <CommunityCard key={c.id} community={c} />
            ))}
          </View>
        )}

        <View style={styles.ctaBanner}>
          <Feather name="zap" size={18} color={C.primary} />
          <View style={styles.ctaText}>
            <Text style={styles.ctaTitle}>More communities coming</Text>
            <Text style={styles.ctaDesc}>Niche groups for every builder niche</Text>
          </View>
        </View>
      </ScrollView>
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
    backgroundColor: C.bg,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    paddingHorizontal: 20,
    justifyContent: "flex-end",
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: C.text,
    letterSpacing: -0.3,
  },
  headerSub: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: C.dim,
    marginTop: 1,
  },
  scroll: { paddingHorizontal: 16, gap: 0 },
  statsBar: {
    flexDirection: "row",
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    marginBottom: 16,
  },
  statItem: { flex: 1, alignItems: "center" },
  statNum: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: C.primary,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
  },
  statLabel: { fontSize: 11, fontFamily: "Inter_400Regular", color: C.dim, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: C.border },
  filterRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
  },
  filterChipActive: { backgroundColor: C.primaryDim, borderColor: C.primaryBorder },
  filterText: { fontSize: 13, fontFamily: "Inter_500Medium", color: C.dim },
  filterTextActive: { color: C.primary },
  list: { gap: 12 },
  card: {
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  cardAccent: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    padding: 16,
    paddingBottom: 12,
  },
  emojiWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  emoji: { fontSize: 22 },
  cardTop: { flex: 1 },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  cardName: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: C.text,
    flex: 1,
    marginRight: 8,
  },
  memberBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  memberCount: { fontSize: 11, fontFamily: "Inter_700Bold" },
  cardDesc: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: C.subtext,
    lineHeight: 19,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 14,
    gap: 8,
  },
  topicsRow: { flexDirection: "row", gap: 6 },
  topic: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  topicText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  joinBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  joinedBtn: { backgroundColor: "transparent" },
  joinText: { fontSize: 13, fontFamily: "Inter_700Bold", color: C.bg },
  joinedText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  empty: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold", color: C.subtext },
  emptyText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: C.dim,
    textAlign: "center",
    lineHeight: 19,
    maxWidth: 260,
  },
  emptyBtn: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: C.primaryDim,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.primaryBorder,
  },
  emptyBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: C.primary },
  ctaBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: C.primaryDim,
    borderRadius: 14,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: C.primaryBorder,
  },
  ctaText: { flex: 1 },
  ctaTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: C.primary },
  ctaDesc: { fontSize: 12, fontFamily: "Inter_400Regular", color: C.subtext, marginTop: 2 },
});
