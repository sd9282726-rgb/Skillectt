import { BlurView } from "expo-blur";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs, usePathname, useRouter } from "expo-router";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { Feather } from "@expo/vector-icons";
import { SymbolView } from "expo-symbols";
import React from "react";
import {
  Platform,
  StyleSheet,
  View,
  Text,
  Pressable,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C } from "@/constants/colors";

const SIDEBAR_W = C.sidebarWidth;

const NAV_ITEMS = [
  { name: "index", label: "Home", icon: "home" as const, path: "/" },
  { name: "explore", label: "Explore", icon: "search" as const, path: "/explore" },
  { name: "communities", label: "Communities", icon: "users" as const, path: "/communities" },
  { name: "messages", label: "Messages", icon: "message-circle" as const, path: "/messages" },
  { name: "profile", label: "Profile", icon: "user" as const, path: "/profile" },
];

function DesktopSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  const isActive = (path: string) => {
    if (path === "/") return pathname === "/" || pathname === "";
    return pathname.startsWith(path);
  };

  return (
    <View style={[styles.sidebar, { paddingTop: insets.top + 24 }]}>
      <View style={styles.logoRow}>
        <Text style={styles.logoText}>Skillect</Text>
        <View style={styles.logoPulse} />
      </View>

      <View style={styles.navList}>
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.path);
          return (
            <Pressable
              key={item.name}
              onPress={() => router.navigate(item.path as any)}
              style={({ pressed }) => [
                styles.navItem,
                active && styles.navItemActive,
                pressed && { opacity: 0.75 },
              ]}
            >
              {active && <View style={styles.activeBar} />}
              <Feather
                name={item.icon}
                size={20}
                color={active ? C.primary : C.dim}
              />
              <Text style={[styles.navLabel, active && styles.navLabelActive]}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable
        onPress={() => router.navigate("/create" as any)}
        style={({ pressed }) => [styles.newPostBtn, pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] }]}
      >
        <Feather name="plus" size={18} color={C.bg} />
        <Text style={styles.newPostText}>New Post</Text>
      </Pressable>
    </View>
  );
}

function NativeTabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "house", selected: "house.fill" }} />
        <Label>Home</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="explore">
        <Icon sf={{ default: "magnifyingglass", selected: "magnifyingglass" }} />
        <Label>Explore</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="create">
        <Icon sf={{ default: "plus.circle.fill", selected: "plus.circle.fill" }} />
        <Label>Post</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="communities">
        <Icon sf={{ default: "person.2", selected: "person.2.fill" }} />
        <Label>Groups</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <Icon sf={{ default: "person", selected: "person.fill" }} />
        <Label>Profile</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function MobileTabLayout() {
  const isIOS = Platform.OS === "ios";
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.primary,
        tabBarInactiveTintColor: C.dim,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : "#040410",
          borderTopWidth: 1,
          borderTopColor: C.border,
          elevation: 0,
          paddingBottom: insets.bottom,
          height: 56 + insets.bottom,
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView intensity={95} tint="dark" style={StyleSheet.absoluteFill} />
          ) : null,
        tabBarLabelStyle: {
          fontFamily: "Inter_500Medium",
          fontSize: 10,
          marginTop: -2,
        },
        tabBarItemStyle: { paddingTop: 4 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) =>
            isIOS ? (
              <SymbolView name={focused ? "house.fill" : "house"} tintColor={color} size={22} />
            ) : (
              <Feather name="home" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: "Explore",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="magnifyingglass" tintColor={color} size={22} />
            ) : (
              <Feather name="search" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: "Post",
          tabBarIcon: ({ focused }) => (
            <View style={[styles.createCircle, focused && styles.createCircleActive]}>
              <Feather name="plus" size={20} color={focused ? C.bg : C.primary} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="communities"
        options={{
          title: "Groups",
          tabBarIcon: ({ color, focused }) =>
            isIOS ? (
              <SymbolView name={focused ? "person.2.fill" : "person.2"} tintColor={color} size={22} />
            ) : (
              <Feather name="users" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, focused }) =>
            isIOS ? (
              <SymbolView name={focused ? "person.fill" : "person"} tintColor={color} size={22} />
            ) : (
              <Feather name="user" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen name="messages" options={{ href: null }} />
    </Tabs>
  );
}

function DesktopLayout() {
  return (
    <View style={styles.desktopRoot}>
      <DesktopSidebar />
      <View style={styles.desktopContent}>
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarStyle: { display: "none" },
          }}
        >
          <Tabs.Screen name="index" options={{ title: "Home" }} />
          <Tabs.Screen name="explore" options={{ title: "Explore" }} />
          <Tabs.Screen name="create" options={{ title: "Post" }} />
          <Tabs.Screen name="communities" options={{ title: "Groups" }} />
          <Tabs.Screen name="profile" options={{ title: "Profile" }} />
          <Tabs.Screen name="messages" options={{ title: "Messages" }} />
        </Tabs>
      </View>
    </View>
  );
}

export default function TabLayout() {
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === "web" && width >= C.desktopBreak;

  if (isDesktop) return <DesktopLayout />;
  if (isLiquidGlassAvailable()) return <NativeTabLayout />;
  return <MobileTabLayout />;
}

const styles = StyleSheet.create({
  desktopRoot: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: C.bg,
  },
  desktopContent: { flex: 1 },
  sidebar: {
    width: SIDEBAR_W,
    backgroundColor: C.bg,
    borderRightWidth: 1,
    borderRightColor: C.border,
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 40,
    paddingHorizontal: 8,
  },
  logoText: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: C.primary,
    letterSpacing: -0.5,
  },
  logoPulse: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: C.primary,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
  },
  navList: { flex: 1, gap: 2 },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: 12,
    position: "relative",
    overflow: "hidden",
  },
  navItemActive: { backgroundColor: C.primaryDim },
  activeBar: {
    position: "absolute",
    left: 0,
    top: 10,
    bottom: 10,
    width: 3,
    borderRadius: 2,
    backgroundColor: C.primary,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 6,
  },
  navLabel: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: C.dim,
  },
  navLabelActive: {
    color: C.primary,
    fontFamily: "Inter_600SemiBold",
  },
  newPostBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: C.primary,
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 20,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
  },
  newPostText: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: C.bg,
  },
  createCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.card,
    borderWidth: 1.5,
    borderColor: C.primaryBorder,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  createCircleActive: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
});
