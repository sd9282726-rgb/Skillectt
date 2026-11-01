import { useEffect, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  StatusBar,
} from "react-native";
import { supabase } from "./lib/supabase";
import type { Session } from "@supabase/supabase-js";

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [posts, setPosts] = useState<any[]>([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;
    supabase
      .from("posts")
      .select("id, content, created_at, profiles:author_id(display_name, username)")
      .order("created_at", { ascending: false })
      .limit(30)
      .then(({ data }) => setPosts(data || []));
  }, [session]);

  const handleAuth = async () => {
    setBusy(true);
    setMessage(null);
    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setMessage(error.message);
      else setMessage("Check your email to confirm your account.");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMessage(error.message);
    }
    setBusy(false);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  if (!session) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.authBox}>
          <Text style={styles.logo}>Skillect</Text>
          <Text style={styles.sub}>
            {mode === "signin" ? "Welcome back" : "Create your account"}
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Email"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          {message ? <Text style={styles.msg}>{message}</Text> : null}
          <TouchableOpacity style={styles.btn} onPress={handleAuth} disabled={busy}>
            <Text style={styles.btnText}>
              {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Sign up"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setMode(mode === "signin" ? "signup" : "signin")}
          >
            <Text style={styles.link}>
              {mode === "signin" ? "Need an account? Sign up" : "Have an account? Sign in"}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <Text style={styles.logoSmall}>Skillect</Text>
        <TouchableOpacity onPress={() => supabase.auth.signOut()}>
          <Text style={styles.link}>Sign out</Text>
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.feed}>
        {posts.length === 0 ? (
          <Text style={styles.empty}>No posts yet. Open the web app to create one.</Text>
        ) : (
          posts.map((p) => (
            <View key={p.id} style={styles.card}>
              <Text style={styles.author}>
                {(p.profiles as any)?.display_name || "User"} @
                {(p.profiles as any)?.username || "user"}
              </Text>
              <Text style={styles.content}>{p.content}</Text>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FFFFFF" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" },
  authBox: { flex: 1, justifyContent: "center", padding: 24 },
  logo: { fontSize: 32, fontWeight: "800", color: "#2563EB", marginBottom: 8 },
  logoSmall: { fontSize: 20, fontWeight: "800", color: "#2563EB" },
  sub: { fontSize: 16, color: "#4B5563", marginBottom: 24 },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    backgroundColor: "#F9FAFB",
  },
  btn: {
    backgroundColor: "#2563EB",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginTop: 8,
  },
  btnText: { color: "#fff", fontWeight: "700" },
  link: { color: "#2563EB", textAlign: "center", marginTop: 16 },
  msg: { color: "#DC2626", marginBottom: 8 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  feed: { padding: 16 },
  card: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  author: { fontWeight: "600", color: "#111827", marginBottom: 6 },
  content: { color: "#374151", lineHeight: 20 },
  empty: { textAlign: "center", color: "#6B7280", marginTop: 40 },
});
