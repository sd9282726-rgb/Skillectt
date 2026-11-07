import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { supabase, type PostRow, type Profile } from './lib/supabase';
import type { Session } from '@supabase/supabase-js';

type Tab = 'feed' | 'explore' | 'create' | 'profile';

const C = {
  bg: '#FFFFFF',
  ink: '#0F172A',
  muted: '#64748B',
  line: '#E2E8F0',
  soft: '#F8FAFC',
  blue: '#2563EB',
  blueDark: '#1D4ED8',
  green: '#059669',
  red: '#DC2626',
};

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [booting, setBooting] = useState(true);
  const [tab, setTab] = useState<Tab>('feed');
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setBooting(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user?.id) {
      setProfile(null);
      return;
    }
    supabase
      .from('profiles')
      .select('id, username, display_name, bio, avatar_url, skills, location')
      .eq('id', session.user.id)
      .maybeSingle()
      .then(({ data }) => setProfile((data as Profile) || null));
  }, [session?.user?.id]);

  if (booting) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={C.blue} />
        <Text style={styles.bootText}>Skillect</Text>
      </View>
    );
  }

  if (!session) return <AuthScreen />;

  return (
    <SafeAreaView style={styles.safe}>
      <ExpoStatusBar style="dark" />
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
      <View style={styles.body}>
        {tab === 'feed' && <FeedScreen userId={session.user.id} />}
        {tab === 'explore' && <ExploreScreen userId={session.user.id} />}
        {tab === 'create' && (
          <CreateScreen
            userId={session.user.id}
            onPosted={() => setTab('feed')}
          />
        )}
        {tab === 'profile' && (
          <ProfileScreen
            session={session}
            profile={profile}
            onProfile={(p) => setProfile(p)}
          />
        )}
      </View>
      <View style={styles.tabBar}>
        {(
          [
            ['feed', 'Feed'],
            ['explore', 'Explore'],
            ['create', 'Create'],
            ['profile', 'Profile'],
          ] as [Tab, string][]
        ).map(([id, label]) => (
          <Pressable key={id} style={styles.tabItem} onPress={() => setTab(id)}>
            <View style={[styles.tabDot, tab === id && styles.tabDotOn]} />
            <Text style={[styles.tabLabel, tab === id && styles.tabLabelOn]}>{label}</Text>
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
}

function AuthScreen() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    setMsg(null);
    setOk(null);
    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({ email: email.trim(), password });
      if (error) setMsg(error.message);
      else setOk('Check your email to confirm, then sign in.');
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) setMsg(error.message);
    }
    setBusy(false);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.authWrap}
      >
        <View style={styles.brandMark}>
          <View style={styles.ring} />
          <Text style={styles.brand}>Skillect</Text>
          <Text style={styles.tagline}>Grow skills. Share progress. Build together.</Text>
        </View>
        <Text style={styles.authTitle}>{mode === 'signin' ? 'Welcome back' : 'Create account'}</Text>
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={C.muted}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Password (min 8 characters)"
          placeholderTextColor={C.muted}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        {msg ? <Text style={styles.err}>{msg}</Text> : null}
        {ok ? <Text style={styles.ok}>{ok}</Text> : null}
        <Pressable style={[styles.primaryBtn, busy && { opacity: 0.6 }]} onPress={submit} disabled={busy}>
          <Text style={styles.primaryBtnText}>
            {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Sign up'}
          </Text>
        </Pressable>
        <Pressable onPress={() => setMode(mode === 'signin' ? 'signup' : 'signin')}>
          <Text style={styles.switchAuth}>
            {mode === 'signin' ? 'New here? Create an account' : 'Have an account? Sign in'}
          </Text>
        </Pressable>
        <Text style={styles.hint}>Amazon / Indus testers: use the credentials in Testing Instructions.</Text>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function FeedScreen({ userId }: { userId: string }) {
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [likes, setLikes] = useState<Record<string, boolean>>({});
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('posts')
      .select('id, author_id, content, media_url, media_type, category, created_at, profiles:author_id(id, username, display_name, avatar_url)')
      .order('created_at', { ascending: false })
      .limit(50);
    const rows = (data as any as PostRow[]) || [];
    setPosts(rows);
    if (rows.length) {
      const ids = rows.map((p) => p.id);
      const { data: myLikes } = await supabase
        .from('post_likes')
        .select('post_id')
        .eq('user_id', userId)
        .in('post_id', ids);
      const map: Record<string, boolean> = {};
      (myLikes || []).forEach((l: any) => {
        map[l.post_id] = true;
      });
      setLikes(map);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleLike = async (postId: string) => {
    const liked = likes[postId];
    setLikes((prev) => ({ ...prev, [postId]: !liked }));
    if (liked) {
      await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', userId);
    } else {
      await supabase.from('post_likes').insert({ post_id: postId, user_id: userId });
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.topBar}>
        <Text style={styles.topTitle}>Feed</Text>
        <Text style={styles.topSub}>Learning in public</Text>
      </View>
      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={C.blue} />
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={async () => {
                setRefreshing(true);
                await load();
                setRefreshing(false);
              }}
              tintColor={C.blue}
            />
          }
          ListEmptyComponent={
            <Text style={styles.empty}>No posts yet. Be the first to share progress.</Text>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.cardName}>
                {item.profiles?.display_name || 'Learner'}{' '}
                <Text style={styles.cardUser}>@{item.profiles?.username || 'user'}</Text>
              </Text>
              <Text style={styles.cardBody}>{item.content}</Text>
              {item.media_url ? (
                <Image source={{ uri: item.media_url }} style={styles.cardImage} resizeMode="cover" />
              ) : null}
              {item.category ? (
                <View style={styles.chip}>
                  <Text style={styles.chipText}>{item.category}</Text>
                </View>
              ) : null}
              <Pressable style={styles.likeRow} onPress={() => toggleLike(item.id)}>
                <Text style={[styles.likeText, likes[item.id] && { color: C.blue }]}>
                  {likes[item.id] ? '★ Liked' : '☆ Like'}
                </Text>
              </Pressable>
            </View>
          )}
        />
      )}
    </View>
  );
}

function CreateScreen({ userId, onPosted }: { userId: string; onPosted: () => void }) {
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('Learning');
  const [mediaUri, setMediaUri] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const pickImage = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
    });
    if (!res.canceled && res.assets?.[0]?.uri) setMediaUri(res.assets[0].uri);
  };

  const publish = async () => {
    if (!content.trim()) {
      Alert.alert('Write something', 'Share what you learned or built.');
      return;
    }
    setBusy(true);
    let media_url: string | null = null;
    try {
      if (mediaUri) {
        const ext = mediaUri.split('.').pop() || 'jpg';
        const path = `${userId}/${Date.now()}.${ext}`;
        const resp = await fetch(mediaUri);
        const blob = await resp.blob();
        const { error: upErr } = await supabase.storage.from('post-media').upload(path, blob, {
          contentType: blob.type || 'image/jpeg',
          upsert: false,
        });
        if (!upErr) {
          const { data } = supabase.storage.from('post-media').getPublicUrl(path);
          media_url = data.publicUrl;
        }
      }
      const { error } = await supabase.from('posts').insert({
        author_id: userId,
        content: content.trim(),
        category,
        media_url,
        media_type: media_url ? 'image' : null,
      });
      if (error) Alert.alert('Could not post', error.message);
      else {
        setContent('');
        setMediaUri(null);
        onPosted();
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to post');
    }
    setBusy(false);
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.topTitle}>Create</Text>
      <Text style={styles.topSub}>Share a skill, win, or work-in-progress</Text>
      <TextInput
        style={[styles.input, { minHeight: 120, textAlignVertical: 'top' }]}
        placeholder="What did you learn or build today?"
        placeholderTextColor={C.muted}
        multiline
        value={content}
        onChangeText={setContent}
      />
      <View style={styles.catRow}>
        {['Learning', 'Building', 'Design', 'Career'].map((c) => (
          <Pressable
            key={c}
            onPress={() => setCategory(c)}
            style={[styles.catChip, category === c && styles.catChipOn]}
          >
            <Text style={[styles.catText, category === c && styles.catTextOn]}>{c}</Text>
          </Pressable>
        ))}
      </View>
      <Pressable style={styles.secondaryBtn} onPress={pickImage}>
        <Text style={styles.secondaryBtnText}>{mediaUri ? 'Change image' : 'Add image'}</Text>
      </Pressable>
      {mediaUri ? <Image source={{ uri: mediaUri }} style={styles.preview} /> : null}
      <Pressable style={[styles.primaryBtn, busy && { opacity: 0.6 }]} onPress={publish} disabled={busy}>
        <Text style={styles.primaryBtnText}>{busy ? 'Posting…' : 'Publish'}</Text>
      </Pressable>
    </ScrollView>
  );
}

function ExploreScreen({ userId }: { userId: string }) {
  const [q, setQ] = useState('');
  const [people, setPeople] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);

  const search = async (text: string) => {
    setQ(text);
    if (text.trim().length < 1) {
      setPeople([]);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('id, username, display_name, bio, avatar_url, skills, location')
      .or(`username.ilike.%${text}%,display_name.ilike.%${text}%`)
      .neq('id', userId)
      .limit(30);
    setPeople((data as Profile[]) || []);
    setLoading(false);
  };

  const follow = async (targetId: string) => {
    const { error } = await supabase.from('follows').insert({
      follower_id: userId,
      following_id: targetId,
    });
    if (error) Alert.alert('Follow', error.message);
    else Alert.alert('Following', 'You are now following this learner.');
  };

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={styles.topTitle}>Explore</Text>
      <TextInput
        style={styles.input}
        placeholder="Search people by name or username"
        placeholderTextColor={C.muted}
        value={q}
        onChangeText={search}
        autoCapitalize="none"
      />
      {loading ? <ActivityIndicator color={C.blue} /> : null}
      <FlatList
        data={people}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <Text style={styles.empty}>{q ? 'No matches' : 'Search for learners to follow'}</Text>
        }
        renderItem={({ item }) => (
          <View style={styles.personRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardName}>{item.display_name || 'Learner'}</Text>
              <Text style={styles.cardUser}>@{item.username || 'user'}</Text>
              {item.bio ? <Text style={styles.bio} numberOfLines={2}>{item.bio}</Text> : null}
            </View>
            <Pressable style={styles.followBtn} onPress={() => follow(item.id)}>
              <Text style={styles.followBtnText}>Follow</Text>
            </Pressable>
          </View>
        )}
      />
    </View>
  );
}

function ProfileScreen({
  session,
  profile,
  onProfile,
}: {
  session: Session;
  profile: Profile | null;
  onProfile: (p: Profile) => void;
}) {
  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [username, setUsername] = useState(profile?.username || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setDisplayName(profile?.display_name || '');
    setUsername(profile?.username || '');
    setBio(profile?.bio || '');
  }, [profile]);

  const save = async () => {
    setBusy(true);
    const payload = {
      id: session.user.id,
      display_name: displayName.trim() || null,
      username: username.trim().toLowerCase() || null,
      bio: bio.trim() || null,
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await supabase.from('profiles').upsert(payload).select().single();
    setBusy(false);
    if (error) Alert.alert('Profile', error.message);
    else if (data) onProfile(data as Profile);
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.topTitle}>Profile</Text>
      <Text style={styles.topSub}>{session.user.email}</Text>
      <Text style={styles.label}>Display name</Text>
      <TextInput style={styles.input} value={displayName} onChangeText={setDisplayName} placeholderTextColor={C.muted} />
      <Text style={styles.label}>Username</Text>
      <TextInput
        style={styles.input}
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
        placeholderTextColor={C.muted}
      />
      <Text style={styles.label}>Bio</Text>
      <TextInput
        style={[styles.input, { minHeight: 90, textAlignVertical: 'top' }]}
        value={bio}
        onChangeText={setBio}
        multiline
        placeholderTextColor={C.muted}
      />
      <Pressable style={[styles.primaryBtn, busy && { opacity: 0.6 }]} onPress={save} disabled={busy}>
        <Text style={styles.primaryBtnText}>{busy ? 'Saving…' : 'Save profile'}</Text>
      </Pressable>
      <Pressable
        style={[styles.secondaryBtn, { marginTop: 12 }]}
        onPress={() => supabase.auth.signOut()}
      >
        <Text style={[styles.secondaryBtnText, { color: C.red }]}>Sign out</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  body: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bg },
  bootText: { marginTop: 12, fontWeight: '800', fontSize: 22, color: C.blue },
  authWrap: { flex: 1, justifyContent: 'center', padding: 24 },
  brandMark: { alignItems: 'center', marginBottom: 28 },
  ring: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 6,
    borderColor: C.blue,
    borderRightColor: 'transparent',
    marginBottom: 12,
    transform: [{ rotate: '-20deg' }],
  },
  brand: { fontSize: 34, fontWeight: '800', color: C.ink },
  tagline: { color: C.muted, marginTop: 6, textAlign: 'center' },
  authTitle: { fontSize: 20, fontWeight: '700', color: C.ink, marginBottom: 14 },
  input: {
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.soft,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    color: C.ink,
    marginBottom: 12,
  },
  primaryBtn: {
    backgroundColor: C.blue,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  secondaryBtnText: { color: C.ink, fontWeight: '600' },
  switchAuth: { textAlign: 'center', color: C.blue, marginTop: 18, fontWeight: '600' },
  hint: { textAlign: 'center', color: C.muted, fontSize: 12, marginTop: 24 },
  err: { color: C.red, marginBottom: 8 },
  ok: { color: C.green, marginBottom: 8 },
  topBar: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  topTitle: { fontSize: 28, fontWeight: '800', color: C.ink },
  topSub: { color: C.muted, marginBottom: 12, marginTop: 2 },
  card: {
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  cardName: { fontWeight: '700', color: C.ink, fontSize: 15 },
  cardUser: { color: C.muted, fontWeight: '500' },
  cardBody: { color: C.ink, marginTop: 8, lineHeight: 22, fontSize: 15 },
  cardImage: { width: '100%', height: 200, borderRadius: 12, marginTop: 12, backgroundColor: C.soft },
  chip: {
    alignSelf: 'flex-start',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginTop: 10,
  },
  chipText: { color: C.blue, fontWeight: '600', fontSize: 12 },
  likeRow: { marginTop: 12 },
  likeText: { color: C.muted, fontWeight: '600' },
  empty: { textAlign: 'center', color: C.muted, marginTop: 40 },
  catRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  catChip: {
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  catChipOn: { backgroundColor: C.blue, borderColor: C.blue },
  catText: { color: C.ink, fontWeight: '600', fontSize: 13 },
  catTextOn: { color: '#fff' },
  preview: { width: '100%', height: 180, borderRadius: 12, marginBottom: 12 },
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: C.line,
    paddingVertical: 14,
    gap: 12,
  },
  bio: { color: C.muted, marginTop: 4, fontSize: 13 },
  followBtn: {
    backgroundColor: C.blue,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  followBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  label: { color: C.muted, marginBottom: 6, fontWeight: '600', fontSize: 13 },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: C.line,
    backgroundColor: C.bg,
    paddingVertical: 10,
    paddingBottom: Platform.OS === 'ios' ? 18 : 10,
  },
  tabItem: { flex: 1, alignItems: 'center' },
  tabDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'transparent', marginBottom: 4 },
  tabDotOn: { backgroundColor: C.blue },
  tabLabel: { fontSize: 12, color: C.muted, fontWeight: '600' },
  tabLabelOn: { color: C.blue },
});
