import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "@clerk/expo";

export interface Post {
  id: string;
  userId: string;
  username: string;
  displayName?: string;
  avatarUri?: string;
  content: string;
  imageUri?: string;
  skillTag: string;
  progressDay?: number;
  postType: "text" | "image" | "progress";
  likedBy: string[];
  savedBy: string[];
  commentCount: number;
  createdAt: string;
}

export interface Comment {
  id: string;
  postId: string;
  userId: string;
  username: string;
  displayName?: string;
  avatarUri?: string;
  content: string;
  createdAt: string;
}

export interface UserProfile {
  userId: string;
  username: string;
  displayName: string;
  bio: string;
  skills: string[];
  customSkills: string[];
  interests: string[];
  currentlyBuilding: string;
  avatarUri?: string;
  onboardingCompleted: boolean;
  followers: string[];
  joinedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  otherUserId: string;
  otherUsername: string;
  otherDisplayName: string;
  otherAvatarUri?: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
}

export interface Project {
  id: string;
  userId: string;
  username: string;
  displayName?: string;
  avatarUri?: string;
  title: string;
  description: string;
  techStack: string[];
  status: "building" | "launched" | "paused";
  liveUrl?: string;
  githubUrl?: string;
  imageUri?: string;
  likedBy: string[];
  createdAt: string;
}

export interface Community {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  topics: string[];
  emoji: string;
  color: string;
}

const K = {
  POSTS: "sk_posts_v4",
  PROFILE: "sk_profile_v4",
  FOLLOWS: "sk_follows_v4",
  SAVED: "sk_saved_v4",
  CONVS: "sk_convs_v4",
  MSGS: "sk_msgs_v4",
  COMMENTS: "sk_comments_v4",
  INIT: "sk_seeds_v4",
  PROJECTS: "sk_projects_v4",
  COMMUNITIES: "sk_comms_v4",
};

const SEED_PROFILES: UserProfile[] = [
  {
    userId: "seed_1",
    username: "aryan_codes",
    displayName: "Aryan Sharma",
    bio: "Self-taught developer from Mumbai. Building apps and learning to think in systems. Shipping daily.",
    skills: ["coding", "aiml", "webdev"],
    customSkills: [],
    interests: ["tech", "startups"],
    currentlyBuilding: "A productivity app for students",
    onboardingCompleted: true,
    followers: ["seed_2", "seed_3"],
    joinedAt: new Date(Date.now() - 90 * 86400000).toISOString(),
  },
  {
    userId: "seed_2",
    username: "priya_trades",
    displayName: "Priya Mehta",
    bio: "Learning technical analysis and building wealth, one trade at a time. Pune. 28-day streak.",
    skills: ["trading", "finance", "investing"],
    customSkills: [],
    interests: ["finance", "business"],
    currentlyBuilding: "A trading journal & analytics app",
    onboardingCompleted: true,
    followers: ["seed_1"],
    joinedAt: new Date(Date.now() - 60 * 86400000).toISOString(),
  },
  {
    userId: "seed_3",
    username: "rishi_builds",
    displayName: "Rishi Kapoor",
    bio: "Freelancer turned founder. Design + marketing. Bangalore. Building in public since day 1.",
    skills: ["design", "freelancing", "marketing"],
    customSkills: [],
    interests: ["design", "startups", "content"],
    currentlyBuilding: "A freelancer toolkit SaaS",
    onboardingCompleted: true,
    followers: ["seed_1", "seed_2"],
    joinedAt: new Date(Date.now() - 120 * 86400000).toISOString(),
  },
];

const SEED_POSTS: Post[] = [
  {
    id: "post_1",
    userId: "seed_1",
    username: "aryan_codes",
    displayName: "Aryan Sharma",
    content:
      "Day 42 — shipped my first working API today. Async/await finally clicked. It's not magic anymore, it's just code.",
    skillTag: "coding",
    progressDay: 42,
    postType: "progress",
    likedBy: ["seed_2", "seed_3"],
    savedBy: [],
    commentCount: 4,
    createdAt: new Date(Date.now() - 3 * 3600000).toISOString(),
  },
  {
    id: "post_2",
    userId: "seed_2",
    username: "priya_trades",
    displayName: "Priya Mehta",
    content:
      "Called the Nifty reversal today using RSI divergence. Backtested this setup 200 times before going live. The invisible work compounds.",
    skillTag: "trading",
    progressDay: 28,
    postType: "progress",
    likedBy: ["seed_1"],
    savedBy: ["seed_3"],
    commentCount: 6,
    createdAt: new Date(Date.now() - 6 * 3600000).toISOString(),
  },
  {
    id: "post_3",
    userId: "seed_3",
    username: "rishi_builds",
    displayName: "Rishi Kapoor",
    content:
      "Closed my third freelance client this week. Started cold outreaching 67 days ago with zero portfolio. Consistency beats talent, every time.",
    skillTag: "freelancing",
    progressDay: 67,
    postType: "progress",
    likedBy: ["seed_1", "seed_2"],
    savedBy: [],
    commentCount: 9,
    createdAt: new Date(Date.now() - 10 * 3600000).toISOString(),
  },
  {
    id: "post_4",
    userId: "seed_1",
    username: "aryan_codes",
    displayName: "Aryan Sharma",
    content:
      "The best way to learn programming is to build something you actually want to use. Tutorials give knowledge. Projects give intuition.",
    skillTag: "coding",
    postType: "text",
    likedBy: ["seed_2", "seed_3"],
    savedBy: ["seed_2"],
    commentCount: 12,
    createdAt: new Date(Date.now() - 22 * 3600000).toISOString(),
  },
  {
    id: "post_5",
    userId: "seed_2",
    username: "priya_trades",
    displayName: "Priya Mehta",
    content:
      "The market taught me a lesson I keep relearning: emotions are the enemy. Set up the trade, walk away, let the thesis play out.",
    skillTag: "trading",
    postType: "text",
    likedBy: ["seed_3"],
    savedBy: [],
    commentCount: 3,
    createdAt: new Date(Date.now() - 30 * 3600000).toISOString(),
  },
];

const SEED_PROJECTS: Project[] = [
  {
    id: "proj_1",
    userId: "seed_1",
    username: "aryan_codes",
    displayName: "Aryan Sharma",
    title: "StudyFlow",
    description:
      "A Pomodoro-based productivity app designed for Indian students. Features smart break reminders, streak tracking, and social accountability.",
    techStack: ["React Native", "Expo", "Firebase", "Node.js"],
    status: "building",
    liveUrl: "",
    githubUrl: "",
    likedBy: ["seed_2", "seed_3"],
    createdAt: new Date(Date.now() - 15 * 86400000).toISOString(),
  },
  {
    id: "proj_2",
    userId: "seed_2",
    username: "priya_trades",
    displayName: "Priya Mehta",
    title: "TradeLog",
    description:
      "A trading journal with analytics. Log every trade, visualise your win rate, and identify emotional patterns in your strategy.",
    techStack: ["React", "Supabase", "Recharts", "Tailwind"],
    status: "launched",
    liveUrl: "https://tradelog.app",
    githubUrl: "",
    likedBy: ["seed_1"],
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
  },
  {
    id: "proj_3",
    userId: "seed_3",
    username: "rishi_builds",
    displayName: "Rishi Kapoor",
    title: "FreelanceKit",
    description:
      "All-in-one toolkit for Indian freelancers. Invoicing, client CRM, proposal templates, and GST-ready billing. Built for Bharat.",
    techStack: ["Next.js", "Drizzle ORM", "Razorpay", "Resend"],
    status: "building",
    liveUrl: "",
    githubUrl: "",
    likedBy: ["seed_1", "seed_2"],
    createdAt: new Date(Date.now() - 45 * 86400000).toISOString(),
  },
];

export const SEED_COMMUNITIES: Community[] = [
  {
    id: "com_1",
    name: "Founders & Builders",
    description:
      "For people building startups, side projects, and products from India. Ship fast, learn faster.",
    memberCount: 2847,
    topics: ["startups", "saas", "product", "growth"],
    emoji: "🚀",
    color: "#7B2FFF",
  },
  {
    id: "com_2",
    name: "Dev Guild",
    description:
      "Open source, web dev, mobile, backend — all things code. India's most active builder community.",
    memberCount: 5123,
    topics: ["coding", "webdev", "opensource", "ai"],
    emoji: "⚡",
    color: "#00FF87",
  },
  {
    id: "com_3",
    name: "Design Lab",
    description:
      "UI/UX designers, visual creators, and brand builders. Critique, feedback, and inspiration.",
    memberCount: 1892,
    topics: ["design", "ux", "figma", "branding"],
    emoji: "🎨",
    color: "#FF6B8A",
  },
  {
    id: "com_4",
    name: "FinTech Traders",
    description:
      "Technical analysis, algorithmic trading, investing strategies, and market discussions.",
    memberCount: 3241,
    topics: ["trading", "finance", "stocks", "crypto"],
    emoji: "📈",
    color: "#FFD060",
  },
  {
    id: "com_5",
    name: "Content Creators",
    description:
      "YouTubers, writers, podcasters, and social media builders. Build an audience, monetise your skills.",
    memberCount: 4567,
    topics: ["content", "youtube", "writing", "social"],
    emoji: "🎬",
    color: "#FF8C42",
  },
  {
    id: "com_6",
    name: "Freelance Hub",
    description:
      "Freelancers, agencies, and consultants. Find clients, share proposals, and grow your practice.",
    memberCount: 2103,
    topics: ["freelancing", "clients", "pricing", "agency"],
    emoji: "💼",
    color: "#00C4FF",
  },
];

function uid9() {
  return Date.now().toString() + Math.random().toString(36).substring(2, 9);
}

interface AppContextType {
  posts: Post[];
  projects: Project[];
  communities: Community[];
  joinedCommunityIds: string[];
  currentUserProfile: UserProfile | null;
  currentUserFollowing: string[];
  savedPostIds: string[];
  isLoadingProfile: boolean;
  addPost: (p: Omit<Post, "id" | "likedBy" | "savedBy" | "commentCount" | "createdAt">) => Promise<void>;
  toggleLike: (postId: string) => Promise<void>;
  toggleSave: (postId: string) => Promise<void>;
  followUser: (targetId: string) => Promise<void>;
  unfollowUser: (targetId: string) => Promise<void>;
  isFollowing: (targetId: string) => boolean;
  getComments: (postId: string) => Promise<Comment[]>;
  addComment: (c: Omit<Comment, "id" | "createdAt">) => Promise<void>;
  saveUserProfile: (profile: UserProfile) => Promise<void>;
  getUserProfile: (userId: string) => Promise<UserProfile | null>;
  getPostsByUser: (userId: string) => Post[];
  getFeedPosts: () => Post[];
  getAllProfiles: () => Promise<UserProfile[]>;
  getConversations: () => Promise<Conversation[]>;
  getMessages: (convId: string) => Promise<Message[]>;
  sendMessage: (toUserId: string, toUsername: string, toDisplayName: string, toAvatarUri: string | undefined, content: string) => Promise<void>;
  getFollowerCount: (userId: string) => Promise<number>;
  getFollowingCount: (userId: string) => Promise<number>;
  addProject: (p: Omit<Project, "id" | "likedBy" | "createdAt">) => Promise<void>;
  getProjectsByUser: (userId: string) => Project[];
  toggleProjectLike: (projectId: string) => Promise<void>;
  joinCommunity: (communityId: string) => Promise<void>;
  leaveCommunity: (communityId: string) => Promise<void>;
  isMemberOf: (communityId: string) => boolean;
}

const AppContext = createContext<AppContextType | null>(null);

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppContext must be inside AppProvider");
  return ctx;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const { userId } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [projects, setProjects] = useState<Project[]>(SEED_PROJECTS);
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);
  const [currentUserFollowing, setCurrentUserFollowing] = useState<string[]>([]);
  const [savedPostIds, setSavedPostIds] = useState<string[]>([]);
  const [joinedCommunityIds, setJoinedCommunityIds] = useState<string[]>([]);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  useEffect(() => { initSeeds(); }, []);

  useEffect(() => {
    if (userId) loadUserData(userId);
    else {
      setCurrentUserProfile(null);
      setCurrentUserFollowing([]);
      setSavedPostIds([]);
      setJoinedCommunityIds([]);
      setIsLoadingProfile(false);
    }
  }, [userId]);

  const initSeeds = async () => {
    try {
      const inited = await AsyncStorage.getItem(K.INIT);
      if (!inited) {
        for (const p of SEED_PROFILES) {
          await AsyncStorage.setItem(`${K.PROFILE}_${p.userId}`, JSON.stringify(p));
        }
        await AsyncStorage.setItem(`${K.FOLLOWS}_seed_1`, JSON.stringify(["seed_2", "seed_3"]));
        await AsyncStorage.setItem(`${K.FOLLOWS}_seed_2`, JSON.stringify(["seed_1"]));
        await AsyncStorage.setItem(`${K.FOLLOWS}_seed_3`, JSON.stringify(["seed_1", "seed_2"]));
        await AsyncStorage.setItem(K.POSTS, JSON.stringify(SEED_POSTS));
        await AsyncStorage.setItem(K.PROJECTS, JSON.stringify(SEED_PROJECTS));
        await AsyncStorage.setItem(K.INIT, "true");
        setPosts(SEED_POSTS);
        setProjects(SEED_PROJECTS);
      } else {
        const storedPosts = await AsyncStorage.getItem(K.POSTS);
        const storedProjects = await AsyncStorage.getItem(K.PROJECTS);
        setPosts(storedPosts ? JSON.parse(storedPosts) : SEED_POSTS);
        setProjects(storedProjects ? JSON.parse(storedProjects) : SEED_PROJECTS);
      }
    } catch {
      setPosts(SEED_POSTS);
      setProjects(SEED_PROJECTS);
    }
  };

  const loadUserData = async (uid: string) => {
    setIsLoadingProfile(true);
    try {
      const [pStr, fStr, sStr, cStr] = await Promise.all([
        AsyncStorage.getItem(`${K.PROFILE}_${uid}`),
        AsyncStorage.getItem(`${K.FOLLOWS}_${uid}`),
        AsyncStorage.getItem(`${K.SAVED}_${uid}`),
        AsyncStorage.getItem(`${K.COMMUNITIES}_${uid}`),
      ]);
      setCurrentUserProfile(pStr ? JSON.parse(pStr) : null);
      setCurrentUserFollowing(fStr ? JSON.parse(fStr) : []);
      setSavedPostIds(sStr ? JSON.parse(sStr) : []);
      setJoinedCommunityIds(cStr ? JSON.parse(cStr) : []);
    } catch {
      setCurrentUserProfile(null);
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const savePosts = async (updated: Post[]) => {
    setPosts(updated);
    await AsyncStorage.setItem(K.POSTS, JSON.stringify(updated));
  };

  const saveProjects = async (updated: Project[]) => {
    setProjects(updated);
    await AsyncStorage.setItem(K.PROJECTS, JSON.stringify(updated));
  };

  const addPost = useCallback(
    async (data: Omit<Post, "id" | "likedBy" | "savedBy" | "commentCount" | "createdAt">) => {
      const np: Post = { ...data, id: uid9(), likedBy: [], savedBy: [], commentCount: 0, createdAt: new Date().toISOString() };
      await savePosts([np, ...posts]);
    },
    [posts]
  );

  const toggleLike = useCallback(async (postId: string) => {
    if (!userId) return;
    await savePosts(posts.map((p) => {
      if (p.id !== postId) return p;
      const has = p.likedBy.includes(userId);
      return { ...p, likedBy: has ? p.likedBy.filter((x) => x !== userId) : [...p.likedBy, userId] };
    }));
  }, [posts, userId]);

  const toggleSave = useCallback(async (postId: string) => {
    if (!userId) return;
    const next = savedPostIds.includes(postId) ? savedPostIds.filter((x) => x !== postId) : [...savedPostIds, postId];
    setSavedPostIds(next);
    await AsyncStorage.setItem(`${K.SAVED}_${userId}`, JSON.stringify(next));
    await savePosts(posts.map((p) => {
      if (p.id !== postId) return p;
      const has = p.savedBy.includes(userId);
      return { ...p, savedBy: has ? p.savedBy.filter((x) => x !== userId) : [...p.savedBy, userId] };
    }));
  }, [posts, savedPostIds, userId]);

  const followUser = useCallback(async (targetId: string) => {
    if (!userId) return;
    const next = [...currentUserFollowing, targetId];
    setCurrentUserFollowing(next);
    await AsyncStorage.setItem(`${K.FOLLOWS}_${userId}`, JSON.stringify(next));
    const tStr = await AsyncStorage.getItem(`${K.PROFILE}_${targetId}`);
    if (tStr) {
      const tp = JSON.parse(tStr) as UserProfile;
      if (!tp.followers.includes(userId)) {
        tp.followers = [...tp.followers, userId];
        await AsyncStorage.setItem(`${K.PROFILE}_${targetId}`, JSON.stringify(tp));
      }
    }
  }, [currentUserFollowing, userId]);

  const unfollowUser = useCallback(async (targetId: string) => {
    if (!userId) return;
    const next = currentUserFollowing.filter((x) => x !== targetId);
    setCurrentUserFollowing(next);
    await AsyncStorage.setItem(`${K.FOLLOWS}_${userId}`, JSON.stringify(next));
    const tStr = await AsyncStorage.getItem(`${K.PROFILE}_${targetId}`);
    if (tStr) {
      const tp = JSON.parse(tStr) as UserProfile;
      tp.followers = tp.followers.filter((x) => x !== userId);
      await AsyncStorage.setItem(`${K.PROFILE}_${targetId}`, JSON.stringify(tp));
    }
  }, [currentUserFollowing, userId]);

  const isFollowing = useCallback((targetId: string) => currentUserFollowing.includes(targetId), [currentUserFollowing]);

  const getComments = useCallback(async (postId: string): Promise<Comment[]> => {
    try {
      const s = await AsyncStorage.getItem(`${K.COMMENTS}_${postId}`);
      return s ? JSON.parse(s) : [];
    } catch { return []; }
  }, []);

  const addComment = useCallback(async (data: Omit<Comment, "id" | "createdAt">) => {
    const c: Comment = { ...data, id: uid9(), createdAt: new Date().toISOString() };
    const existing = await getComments(data.postId);
    await AsyncStorage.setItem(`${K.COMMENTS}_${data.postId}`, JSON.stringify([...existing, c]));
    await savePosts(posts.map((p) => p.id === data.postId ? { ...p, commentCount: p.commentCount + 1 } : p));
  }, [getComments, posts]);

  const saveUserProfile = useCallback(async (profile: UserProfile) => {
    setCurrentUserProfile(profile);
    await AsyncStorage.setItem(`${K.PROFILE}_${profile.userId}`, JSON.stringify(profile));
  }, []);

  const getUserProfile = useCallback(async (uid: string): Promise<UserProfile | null> => {
    try {
      const s = await AsyncStorage.getItem(`${K.PROFILE}_${uid}`);
      return s ? JSON.parse(s) : null;
    } catch { return null; }
  }, []);

  const getPostsByUser = useCallback((uid: string) => posts.filter((p) => p.userId === uid), [posts]);

  const getFeedPosts = useCallback(() => {
    const priority = new Set([...currentUserFollowing, ...(userId ? [userId] : [])]);
    const hi = posts.filter((p) => priority.has(p.userId));
    const lo = posts.filter((p) => !priority.has(p.userId));
    const byDate = (a: Post, b: Post) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    return [...hi.sort(byDate), ...lo.sort(byDate)];
  }, [posts, currentUserFollowing, userId]);

  const getAllProfiles = useCallback(async (): Promise<UserProfile[]> => {
    const out: UserProfile[] = [];
    for (const sp of SEED_PROFILES) {
      const s = await AsyncStorage.getItem(`${K.PROFILE}_${sp.userId}`);
      if (s) out.push(JSON.parse(s));
    }
    if (userId && currentUserProfile) out.push(currentUserProfile);
    return out;
  }, [userId, currentUserProfile]);

  const getConversations = useCallback(async (): Promise<Conversation[]> => {
    if (!userId) return [];
    try {
      const s = await AsyncStorage.getItem(`${K.CONVS}_${userId}`);
      return s ? JSON.parse(s) : [];
    } catch { return []; }
  }, [userId]);

  const getMessages = useCallback(async (convId: string): Promise<Message[]> => {
    try {
      const s = await AsyncStorage.getItem(`${K.MSGS}_${convId}`);
      return s ? JSON.parse(s) : [];
    } catch { return []; }
  }, []);

  const sendMessage = useCallback(async (toUserId: string, toUsername: string, toDisplayName: string, toAvatarUri: string | undefined, content: string) => {
    if (!userId || !currentUserProfile) return;
    const convId = [userId, toUserId].sort().join("_");
    const msg: Message = { id: uid9(), conversationId: convId, senderId: userId, content, createdAt: new Date().toISOString() };
    const existing = await getMessages(convId);
    await AsyncStorage.setItem(`${K.MSGS}_${convId}`, JSON.stringify([...existing, msg]));
    const convs = await getConversations();
    const idx = convs.findIndex((c) => c.id === convId);
    const conv: Conversation = { id: convId, otherUserId: toUserId, otherUsername: toUsername, otherDisplayName: toDisplayName, otherAvatarUri: toAvatarUri, lastMessage: content, lastMessageTime: msg.createdAt, unreadCount: 0 };
    if (idx >= 0) convs[idx] = { ...convs[idx], ...conv };
    else convs.unshift(conv);
    await AsyncStorage.setItem(`${K.CONVS}_${userId}`, JSON.stringify(convs));
  }, [userId, currentUserProfile, getMessages, getConversations]);

  const getFollowerCount = useCallback(async (uid: string): Promise<number> => {
    const p = await getUserProfile(uid);
    return p?.followers.length ?? 0;
  }, [getUserProfile]);

  const getFollowingCount = useCallback(async (uid: string): Promise<number> => {
    try {
      const s = await AsyncStorage.getItem(`${K.FOLLOWS}_${uid}`);
      return s ? (JSON.parse(s) as string[]).length : 0;
    } catch { return 0; }
  }, []);

  const addProject = useCallback(async (data: Omit<Project, "id" | "likedBy" | "createdAt">) => {
    const np: Project = { ...data, id: uid9(), likedBy: [], createdAt: new Date().toISOString() };
    await saveProjects([np, ...projects]);
  }, [projects]);

  const getProjectsByUser = useCallback((uid: string) => projects.filter((p) => p.userId === uid), [projects]);

  const toggleProjectLike = useCallback(async (projectId: string) => {
    if (!userId) return;
    await saveProjects(projects.map((p) => {
      if (p.id !== projectId) return p;
      const has = p.likedBy.includes(userId);
      return { ...p, likedBy: has ? p.likedBy.filter((x) => x !== userId) : [...p.likedBy, userId] };
    }));
  }, [projects, userId]);

  const joinCommunity = useCallback(async (communityId: string) => {
    if (!userId) return;
    const next = [...joinedCommunityIds, communityId];
    setJoinedCommunityIds(next);
    await AsyncStorage.setItem(`${K.COMMUNITIES}_${userId}`, JSON.stringify(next));
  }, [joinedCommunityIds, userId]);

  const leaveCommunity = useCallback(async (communityId: string) => {
    if (!userId) return;
    const next = joinedCommunityIds.filter((x) => x !== communityId);
    setJoinedCommunityIds(next);
    await AsyncStorage.setItem(`${K.COMMUNITIES}_${userId}`, JSON.stringify(next));
  }, [joinedCommunityIds, userId]);

  const isMemberOf = useCallback((communityId: string) => joinedCommunityIds.includes(communityId), [joinedCommunityIds]);

  return (
    <AppContext.Provider value={{
      posts, projects, communities: SEED_COMMUNITIES, joinedCommunityIds,
      currentUserProfile, currentUserFollowing, savedPostIds, isLoadingProfile,
      addPost, toggleLike, toggleSave, followUser, unfollowUser, isFollowing,
      getComments, addComment, saveUserProfile, getUserProfile, getPostsByUser,
      getFeedPosts, getAllProfiles, getConversations, getMessages, sendMessage,
      getFollowerCount, getFollowingCount,
      addProject, getProjectsByUser, toggleProjectLike,
      joinCommunity, leaveCommunity, isMemberOf,
    }}>
      {children}
    </AppContext.Provider>
  );
}
