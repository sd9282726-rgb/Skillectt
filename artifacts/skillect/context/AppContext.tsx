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
  content: string;
  imageUri?: string;
  skillTag: string;
  progressDay: number;
  likedBy: string[];
  commentCount: number;
  createdAt: string;
}

export interface Comment {
  id: string;
  postId: string;
  userId: string;
  username: string;
  content: string;
  createdAt: string;
}

export interface UserProfile {
  userId: string;
  username: string;
  bio: string;
  skills: string[];
  onboardingCompleted: boolean;
}

const POSTS_KEY = "skillect_posts";
const COMMENTS_KEY = "skillect_comments";
const PROFILES_KEY = "skillect_profiles";

const SEED_POSTS: Post[] = [
  {
    id: "seed_1",
    userId: "seed_user_1",
    username: "aryan_codes",
    content:
      "Just built my first React Native app from scratch. 30 days ago I couldn't even center a div. The consistency is paying off.",
    skillTag: "coding",
    progressDay: 30,
    likedBy: ["seed_user_2", "seed_user_3"],
    commentCount: 3,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "seed_2",
    userId: "seed_user_2",
    username: "priya_trades",
    content:
      "Finally understood support & resistance after weeks of backtesting on Nifty. The market teaches you more than any course.",
    skillTag: "trading",
    progressDay: 45,
    likedBy: ["seed_user_1"],
    commentCount: 5,
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "seed_3",
    userId: "seed_user_3",
    username: "rishi_builds",
    content:
      "Landed my first freelance client. Rs 15,000 for a landing page. 90 days ago I didn't even know what a wireframe was.",
    skillTag: "freelancing",
    progressDay: 90,
    likedBy: ["seed_user_1", "seed_user_2", "seed_user_4"],
    commentCount: 8,
    createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "seed_4",
    userId: "seed_user_4",
    username: "meghna_creates",
    content:
      "Posted my first YouTube video. Only 14 views but I showed up. Day 1 is always the hardest. Not stopping till 100.",
    skillTag: "youtube",
    progressDay: 1,
    likedBy: ["seed_user_2"],
    commentCount: 2,
    createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "seed_5",
    userId: "seed_user_5",
    username: "dev_rohan",
    content:
      "Reading a balance sheet used to feel impossible. 15 days in and I can now analyze a company's financials in under 10 minutes.",
    skillTag: "finance",
    progressDay: 15,
    likedBy: ["seed_user_3", "seed_user_1"],
    commentCount: 4,
    createdAt: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "seed_6",
    userId: "seed_user_6",
    username: "siya_markets",
    content:
      "Ran my first Google Ads campaign today. CTR was 3.2% which apparently is above average. Starting to connect the dots.",
    skillTag: "marketing",
    progressDay: 22,
    likedBy: ["seed_user_1", "seed_user_5"],
    commentCount: 6,
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
];

interface AppContextType {
  posts: Post[];
  currentUserProfile: UserProfile | null;
  isLoadingProfile: boolean;
  addPost: (
    post: Omit<Post, "id" | "likedBy" | "commentCount" | "createdAt">
  ) => Promise<void>;
  toggleLike: (postId: string, userId: string) => Promise<void>;
  getComments: (postId: string) => Promise<Comment[]>;
  addComment: (comment: Omit<Comment, "id" | "createdAt">) => Promise<void>;
  saveUserProfile: (profile: UserProfile) => Promise<void>;
  getUserProfile: (userId: string) => Promise<UserProfile | null>;
  getPostsByUser: (userId: string) => Post[];
}

const AppContext = createContext<AppContextType | null>(null);

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppContext must be used within AppProvider");
  return ctx;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const { userId } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [currentUserProfile, setCurrentUserProfile] =
    useState<UserProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  useEffect(() => {
    loadPosts();
  }, []);

  useEffect(() => {
    if (userId) {
      loadCurrentUserProfile(userId);
    } else {
      setCurrentUserProfile(null);
      setIsLoadingProfile(false);
    }
  }, [userId]);

  const loadPosts = async () => {
    try {
      const stored = await AsyncStorage.getItem(POSTS_KEY);
      if (stored) {
        setPosts(JSON.parse(stored) as Post[]);
      } else {
        await AsyncStorage.setItem(POSTS_KEY, JSON.stringify(SEED_POSTS));
        setPosts(SEED_POSTS);
      }
    } catch {
      setPosts(SEED_POSTS);
    }
  };

  const loadCurrentUserProfile = async (uid: string) => {
    setIsLoadingProfile(true);
    try {
      const stored = await AsyncStorage.getItem(`${PROFILES_KEY}_${uid}`);
      setCurrentUserProfile(stored ? (JSON.parse(stored) as UserProfile) : null);
    } catch {
      setCurrentUserProfile(null);
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const addPost = useCallback(
    async (
      postData: Omit<Post, "id" | "likedBy" | "commentCount" | "createdAt">
    ) => {
      const newPost: Post = {
        ...postData,
        id:
          Date.now().toString() + Math.random().toString(36).substring(2, 9),
        likedBy: [],
        commentCount: 0,
        createdAt: new Date().toISOString(),
      };
      const updated = [newPost, ...posts];
      setPosts(updated);
      await AsyncStorage.setItem(POSTS_KEY, JSON.stringify(updated));
    },
    [posts]
  );

  const toggleLike = useCallback(
    async (postId: string, uid: string) => {
      const updated = posts.map((p) => {
        if (p.id !== postId) return p;
        const liked = p.likedBy.includes(uid);
        return {
          ...p,
          likedBy: liked
            ? p.likedBy.filter((id) => id !== uid)
            : [...p.likedBy, uid],
        };
      });
      setPosts(updated);
      await AsyncStorage.setItem(POSTS_KEY, JSON.stringify(updated));
    },
    [posts]
  );

  const getComments = useCallback(async (postId: string): Promise<Comment[]> => {
    try {
      const stored = await AsyncStorage.getItem(`${COMMENTS_KEY}_${postId}`);
      return stored ? (JSON.parse(stored) as Comment[]) : [];
    } catch {
      return [];
    }
  }, []);

  const addComment = useCallback(
    async (commentData: Omit<Comment, "id" | "createdAt">) => {
      const comment: Comment = {
        ...commentData,
        id:
          Date.now().toString() + Math.random().toString(36).substring(2, 9),
        createdAt: new Date().toISOString(),
      };
      const existing = await getComments(commentData.postId);
      const updatedComments = [...existing, comment];
      await AsyncStorage.setItem(
        `${COMMENTS_KEY}_${commentData.postId}`,
        JSON.stringify(updatedComments)
      );
      const updatedPosts = posts.map((p) =>
        p.id === commentData.postId
          ? { ...p, commentCount: p.commentCount + 1 }
          : p
      );
      setPosts(updatedPosts);
      await AsyncStorage.setItem(POSTS_KEY, JSON.stringify(updatedPosts));
    },
    [getComments, posts]
  );

  const saveUserProfile = useCallback(async (profile: UserProfile) => {
    setCurrentUserProfile(profile);
    await AsyncStorage.setItem(
      `${PROFILES_KEY}_${profile.userId}`,
      JSON.stringify(profile)
    );
  }, []);

  const getUserProfile = useCallback(
    async (uid: string): Promise<UserProfile | null> => {
      try {
        const stored = await AsyncStorage.getItem(`${PROFILES_KEY}_${uid}`);
        return stored ? (JSON.parse(stored) as UserProfile) : null;
      } catch {
        return null;
      }
    },
    []
  );

  const getPostsByUser = useCallback(
    (uid: string): Post[] => posts.filter((p) => p.userId === uid),
    [posts]
  );

  return (
    <AppContext.Provider
      value={{
        posts,
        currentUserProfile,
        isLoadingProfile,
        addPost,
        toggleLike,
        getComments,
        addComment,
        saveUserProfile,
        getUserProfile,
        getPostsByUser,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}
