import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useUser } from "@clerk/react";

export interface UserProfile {
  id: string;
  name: string;
  username: string;
  avatar: string;
  bio: string;
  skills: string[];
  location: string;
  followers: string[];
  following: string[];
  joinedCommunities: string[];
  onboarded: boolean;
}

export interface Post {
  id: string;
  authorId: string;
  content: string;
  image?: string;
  tags: string[];
  likes: string[];
  comments: Comment[];
  createdAt: number;
}

export interface Comment {
  id: string;
  authorId: string;
  content: string;
  createdAt: number;
}

export interface Project {
  id: string;
  authorId: string;
  title: string;
  description: string;
  image?: string;
  tags: string[];
  links: { label: string; url: string }[];
  createdAt: number;
}

export interface Message {
  id: string;
  senderId: string;
  content: string;
  createdAt: number;
}

export interface Conversation {
  id: string;
  participantIds: string[];
  messages: Message[];
}

export interface Community {
  id: string;
  name: string;
  description: string;
  cover: string;
  members: string[];
  tags: string[];
}

interface SeedData {
  profiles: Record<string, UserProfile>;
  posts: Post[];
  projects: Project[];
  conversations: Conversation[];
  communities: Community[];
}

const STORAGE_KEY = "skillect_data_v1";

function seedProfiles(): Record<string, UserProfile> {
  return {
    aryan_codes: {
      id: "aryan_codes",
      name: "Aryan Mehta",
      username: "aryan_codes",
      avatar: "https://api.dicebear.com/9.x/avataaars/svg?seed=Aryan",
      bio: "Full-stack developer. Building in public. React, Node, and a lot of coffee.",
      skills: ["React", "Node.js", "TypeScript", "PostgreSQL"],
      location: "Bengaluru, India",
      followers: ["priya_trades", "rishi_builds"],
      following: ["priya_trades"],
      joinedCommunities: ["c1", "c2"],
      onboarded: true,
    },
    priya_trades: {
      id: "priya_trades",
      name: "Priya Sharma",
      username: "priya_trades",
      avatar: "https://api.dicebear.com/9.x/avataaars/svg?seed=Priya",
      bio: "Product designer turned indie hacker. I trade UI polish for good coffee.",
      skills: ["Figma", "UI/UX", "Branding", "Motion Design"],
      location: "Mumbai, India",
      followers: ["aryan_codes"],
      following: ["aryan_codes", "rishi_builds"],
      joinedCommunities: ["c1"],
      onboarded: true,
    },
    rishi_builds: {
      id: "rishi_builds",
      name: "Rishi Kapoor",
      username: "rishi_builds",
      avatar: "https://api.dicebear.com/9.x/avataaars/svg?seed=Rishi",
      bio: "Hardware tinkerer & robotics enthusiast. Currently building autonomous drones.",
      skills: ["Robotics", "C++", "IoT", "3D Printing"],
      location: "Pune, India",
      followers: [],
      following: ["aryan_codes"],
      joinedCommunities: ["c2", "c3"],
      onboarded: true,
    },
  };
}

function seedPosts(): Post[] {
  const now = Date.now();
  return [
    {
      id: "p1",
      authorId: "aryan_codes",
      content:
        "Just shipped a real-time collaboration feature using WebSockets + CRDTs. The conflict resolution logic took way longer than expected but it finally feels magic ✨",
      tags: ["react", "webrtc", "buildinpublic"],
      likes: ["priya_trades"],
      comments: [
        {
          id: "cm1",
          authorId: "priya_trades",
          content: "This is so clean, would love a walkthrough!",
          createdAt: now - 1000 * 60 * 40,
        },
      ],
      createdAt: now - 1000 * 60 * 60 * 2,
    },
    {
      id: "p2",
      authorId: "priya_trades",
      content:
        "Redesigned the onboarding flow for my side project — cut drop-off by 30%. Sometimes less really is more.",
      image:
        "https://images.unsplash.com/photo-1581276879432-15e50529f34b?w=900&q=80",
      tags: ["design", "ux"],
      likes: ["aryan_codes", "rishi_builds"],
      comments: [],
      createdAt: now - 1000 * 60 * 60 * 6,
    },
    {
      id: "p3",
      authorId: "rishi_builds",
      content:
        "First successful autonomous flight test today! Drone held a stable hover for 3 minutes on the new flight controller firmware.",
      image:
        "https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=900&q=80",
      tags: ["robotics", "hardware"],
      likes: ["aryan_codes"],
      comments: [],
      createdAt: now - 1000 * 60 * 60 * 24,
    },
  ];
}

function seedProjects(): Project[] {
  const now = Date.now();
  return [
    {
      id: "pr1",
      authorId: "aryan_codes",
      title: "PairSync",
      description:
        "A real-time pair-programming tool with live cursors, voice, and CRDT-backed text sync.",
      image:
        "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=900&q=80",
      tags: ["React", "WebSockets", "CRDT"],
      links: [{ label: "GitHub", url: "https://github.com" }],
      createdAt: now - 1000 * 60 * 60 * 24 * 3,
    },
    {
      id: "pr2",
      authorId: "priya_trades",
      title: "Formless",
      description:
        "A minimal form builder with drag-and-drop UI blocks and instant preview.",
      image:
        "https://images.unsplash.com/photo-1559028006-448665bd7c7f?w=900&q=80",
      tags: ["Figma", "Design System"],
      links: [{ label: "Case Study", url: "https://example.com" }],
      createdAt: now - 1000 * 60 * 60 * 24 * 6,
    },
    {
      id: "pr3",
      authorId: "rishi_builds",
      title: "SkyPilot Drone",
      description:
        "Autonomous quadcopter with obstacle avoidance built on a custom flight controller.",
      image:
        "https://images.unsplash.com/photo-1508444845599-5c89863b1c44?w=900&q=80",
      tags: ["Robotics", "C++", "IoT"],
      links: [],
      createdAt: now - 1000 * 60 * 60 * 24 * 10,
    },
  ];
}

function seedConversations(): Conversation[] {
  const now = Date.now();
  return [
    {
      id: "conv1",
      participantIds: ["aryan_codes", "priya_trades"],
      messages: [
        {
          id: "m1",
          senderId: "priya_trades",
          content: "Hey! Loved your last post on CRDTs, do you have time to chat?",
          createdAt: now - 1000 * 60 * 90,
        },
        {
          id: "m2",
          senderId: "aryan_codes",
          content: "Of course! Happy to hop on a call this week.",
          createdAt: now - 1000 * 60 * 80,
        },
      ],
    },
  ];
}

function seedCommunities(): Community[] {
  return [
    {
      id: "c1",
      name: "Frontend Builders",
      description: "A community for people obsessed with pixel-perfect UI and DX.",
      cover:
        "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=900&q=80",
      members: ["aryan_codes", "priya_trades"],
      tags: ["react", "css", "design"],
    },
    {
      id: "c2",
      name: "Indie Makers",
      description: "Building products in public, sharing wins, losses, and MRR.",
      cover:
        "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=900&q=80",
      members: ["aryan_codes", "rishi_builds"],
      tags: ["startup", "buildinpublic"],
    },
    {
      id: "c3",
      name: "Robotics Lab",
      description: "For hobbyists and pros building robots, drones, and IoT devices.",
      cover:
        "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=900&q=80",
      members: ["rishi_builds"],
      tags: ["robotics", "hardware", "iot"],
    },
  ];
}

function seedData(): SeedData {
  return {
    profiles: seedProfiles(),
    posts: seedPosts(),
    projects: seedProjects(),
    conversations: seedConversations(),
    communities: seedCommunities(),
  };
}

function loadData(): SeedData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as SeedData;
  } catch {
    // ignore parse errors, fall through to seed
  }
  const data = seedData();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  return data;
}

interface AppContextValue {
  currentUserId: string | null;
  profiles: Record<string, UserProfile>;
  posts: Post[];
  projects: Project[];
  conversations: Conversation[];
  communities: Community[];
  getProfile: (id: string) => UserProfile | undefined;
  getCurrentProfile: () => UserProfile | undefined;
  completeOnboarding: (updates: Partial<UserProfile>) => void;
  addPost: (content: string, tags: string[], image?: string) => void;
  toggleLike: (postId: string) => void;
  addComment: (postId: string, content: string) => void;
  addProject: (project: Omit<Project, "id" | "authorId" | "createdAt">) => void;
  followUser: (userId: string) => void;
  unfollowUser: (userId: string) => void;
  joinCommunity: (communityId: string) => void;
  leaveCommunity: (communityId: string) => void;
  sendMessage: (conversationId: string, content: string) => void;
  startConversation: (userId: string) => string;
  updateProfile: (updates: Partial<UserProfile>) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const { user } = useUser();
  const [data, setData] = useState<SeedData>(() => loadData());

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  const currentUserId = useMemo(() => {
    if (!user) return null;
    return user.id;
  }, [user]);

  useEffect(() => {
    if (!user) return;
    setData((prev) => {
      if (prev.profiles[user.id]) return prev;
      const username =
        user.username ||
        user.primaryEmailAddress?.emailAddress?.split("@")[0] ||
        user.id.slice(0, 8);
      const newProfile: UserProfile = {
        id: user.id,
        name: user.fullName || username,
        username,
        avatar:
          user.imageUrl ||
          `https://api.dicebear.com/9.x/avataaars/svg?seed=${username}`,
        bio: "",
        skills: [],
        location: "",
        followers: [],
        following: [],
        joinedCommunities: [],
        onboarded: false,
      };
      return {
        ...prev,
        profiles: { ...prev.profiles, [user.id]: newProfile },
      };
    });
  }, [user]);

  const getProfile = useCallback(
    (id: string) => data.profiles[id],
    [data.profiles],
  );

  const getCurrentProfile = useCallback(() => {
    if (!currentUserId) return undefined;
    return data.profiles[currentUserId];
  }, [currentUserId, data.profiles]);

  const completeOnboarding = useCallback(
    (updates: Partial<UserProfile>) => {
      if (!currentUserId) return;
      setData((prev) => ({
        ...prev,
        profiles: {
          ...prev.profiles,
          [currentUserId]: {
            ...prev.profiles[currentUserId],
            ...updates,
            onboarded: true,
          },
        },
      }));
    },
    [currentUserId],
  );

  const updateProfile = useCallback(
    (updates: Partial<UserProfile>) => {
      if (!currentUserId) return;
      setData((prev) => ({
        ...prev,
        profiles: {
          ...prev.profiles,
          [currentUserId]: { ...prev.profiles[currentUserId], ...updates },
        },
      }));
    },
    [currentUserId],
  );

  const addPost = useCallback(
    (content: string, tags: string[], image?: string) => {
      if (!currentUserId) return;
      const newPost: Post = {
        id: `p${Date.now()}`,
        authorId: currentUserId,
        content,
        image,
        tags,
        likes: [],
        comments: [],
        createdAt: Date.now(),
      };
      setData((prev) => ({ ...prev, posts: [newPost, ...prev.posts] }));
    },
    [currentUserId],
  );

  const toggleLike = useCallback(
    (postId: string) => {
      if (!currentUserId) return;
      setData((prev) => ({
        ...prev,
        posts: prev.posts.map((post) => {
          if (post.id !== postId) return post;
          const liked = post.likes.includes(currentUserId);
          return {
            ...post,
            likes: liked
              ? post.likes.filter((id) => id !== currentUserId)
              : [...post.likes, currentUserId],
          };
        }),
      }));
    },
    [currentUserId],
  );

  const addComment = useCallback(
    (postId: string, content: string) => {
      if (!currentUserId) return;
      setData((prev) => ({
        ...prev,
        posts: prev.posts.map((post) =>
          post.id === postId
            ? {
                ...post,
                comments: [
                  ...post.comments,
                  {
                    id: `cm${Date.now()}`,
                    authorId: currentUserId,
                    content,
                    createdAt: Date.now(),
                  },
                ],
              }
            : post,
        ),
      }));
    },
    [currentUserId],
  );

  const addProject = useCallback(
    (project: Omit<Project, "id" | "authorId" | "createdAt">) => {
      if (!currentUserId) return;
      const newProject: Project = {
        ...project,
        id: `pr${Date.now()}`,
        authorId: currentUserId,
        createdAt: Date.now(),
      };
      setData((prev) => ({ ...prev, projects: [newProject, ...prev.projects] }));
    },
    [currentUserId],
  );

  const followUser = useCallback(
    (userId: string) => {
      if (!currentUserId || currentUserId === userId) return;
      setData((prev) => ({
        ...prev,
        profiles: {
          ...prev.profiles,
          [currentUserId]: {
            ...prev.profiles[currentUserId],
            following: Array.from(
              new Set([...prev.profiles[currentUserId].following, userId]),
            ),
          },
          [userId]: prev.profiles[userId]
            ? {
                ...prev.profiles[userId],
                followers: Array.from(
                  new Set([...prev.profiles[userId].followers, currentUserId]),
                ),
              }
            : prev.profiles[userId],
        },
      }));
    },
    [currentUserId],
  );

  const unfollowUser = useCallback(
    (userId: string) => {
      if (!currentUserId) return;
      setData((prev) => ({
        ...prev,
        profiles: {
          ...prev.profiles,
          [currentUserId]: {
            ...prev.profiles[currentUserId],
            following: prev.profiles[currentUserId].following.filter(
              (id) => id !== userId,
            ),
          },
          [userId]: prev.profiles[userId]
            ? {
                ...prev.profiles[userId],
                followers: prev.profiles[userId].followers.filter(
                  (id) => id !== currentUserId,
                ),
              }
            : prev.profiles[userId],
        },
      }));
    },
    [currentUserId],
  );

  const joinCommunity = useCallback(
    (communityId: string) => {
      if (!currentUserId) return;
      setData((prev) => ({
        ...prev,
        communities: prev.communities.map((c) =>
          c.id === communityId
            ? { ...c, members: Array.from(new Set([...c.members, currentUserId])) }
            : c,
        ),
        profiles: {
          ...prev.profiles,
          [currentUserId]: {
            ...prev.profiles[currentUserId],
            joinedCommunities: Array.from(
              new Set([
                ...prev.profiles[currentUserId].joinedCommunities,
                communityId,
              ]),
            ),
          },
        },
      }));
    },
    [currentUserId],
  );

  const leaveCommunity = useCallback(
    (communityId: string) => {
      if (!currentUserId) return;
      setData((prev) => ({
        ...prev,
        communities: prev.communities.map((c) =>
          c.id === communityId
            ? { ...c, members: c.members.filter((id) => id !== currentUserId) }
            : c,
        ),
        profiles: {
          ...prev.profiles,
          [currentUserId]: {
            ...prev.profiles[currentUserId],
            joinedCommunities: prev.profiles[currentUserId].joinedCommunities.filter(
              (id) => id !== communityId,
            ),
          },
        },
      }));
    },
    [currentUserId],
  );

  const startConversation = useCallback(
    (userId: string) => {
      if (!currentUserId) return "";
      const existing = data.conversations.find(
        (c) =>
          c.participantIds.includes(currentUserId) &&
          c.participantIds.includes(userId),
      );
      if (existing) return existing.id;
      const newConv: Conversation = {
        id: `conv${Date.now()}`,
        participantIds: [currentUserId, userId],
        messages: [],
      };
      setData((prev) => ({
        ...prev,
        conversations: [...prev.conversations, newConv],
      }));
      return newConv.id;
    },
    [currentUserId, data.conversations],
  );

  const sendMessage = useCallback(
    (conversationId: string, content: string) => {
      if (!currentUserId) return;
      setData((prev) => ({
        ...prev,
        conversations: prev.conversations.map((c) =>
          c.id === conversationId
            ? {
                ...c,
                messages: [
                  ...c.messages,
                  {
                    id: `m${Date.now()}`,
                    senderId: currentUserId,
                    content,
                    createdAt: Date.now(),
                  },
                ],
              }
            : c,
        ),
      }));
    },
    [currentUserId],
  );

  const value: AppContextValue = {
    currentUserId,
    profiles: data.profiles,
    posts: data.posts,
    projects: data.projects,
    conversations: data.conversations,
    communities: data.communities,
    getProfile,
    getCurrentProfile,
    completeOnboarding,
    addPost,
    toggleLike,
    addComment,
    addProject,
    followUser,
    unfollowUser,
    joinCommunity,
    leaveCommunity,
    sendMessage,
    startConversation,
    updateProfile,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
