import {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  type ReactNode,
} from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";

export interface Profile {
  id: string;
  display_name: string;
  username: string;
  avatar_url?: string | null;
  cover_url?: string | null;
  bio: string;
  location?: string | null;
  website?: string | null;
  skills: string[];
  interests: string[];
  country?: string | null;
  onboarded: boolean;
  is_private?: boolean;
  created_at?: string;
  updated_at?: string;
}

interface AppContextValue {
  currentUserId: string | null;
  profile: Profile | undefined;
  isProfileLoading: boolean;
  refreshProfile: () => Promise<void>;
  updateProfile: (update: Partial<Profile>) => Promise<Profile | null>;
  completeOnboarding: (update: Partial<Profile>) => Promise<Profile | null>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | undefined>(undefined);
  const [isProfileLoading, setIsProfileLoading] = useState(true);

  const fetchProfile = async () => {
    if (!user) {
      setProfile(undefined);
      setIsProfileLoading(false);
      return;
    }

    setIsProfileLoading(true);
    const profileFields = "id,display_name,username,avatar_url,cover_url,bio,location,website,skills,interests,country,onboarded,is_private,created_at,updated_at";
    const { data, error } = await supabase
      .from("profiles")
      .select(profileFields)
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      console.error("Failed to load profile", error);
      setProfile(undefined);
      setIsProfileLoading(false);
      return;
    }

    if (data) {
      setProfile(data as Profile);
      setIsProfileLoading(false);
      return;
    }

    const metadata = user.user_metadata || {};
    const displayName = String(metadata.display_name || user.email?.split("@")[0] || "Skillect member").slice(0, 50);
    const requestedUsername = String(metadata.username || `member_${user.id.slice(0, 8)}`).toLowerCase();
    const insertProfile = async (username: string) => supabase
      .from("profiles")
      .insert({ id: user.id, display_name: displayName, username })
      .select(profileFields)
      .single();

    let created = await insertProfile(requestedUsername);
    if (created.error?.code === "23505") {
      created = await insertProfile(`member_${user.id.slice(0, 8)}`);
    }

    if (created.error || !created.data) {
      console.error("Failed to create missing profile", created.error);
      setProfile(undefined);
    } else {
      setProfile(created.data as Profile);
    }
    setIsProfileLoading(false);
  };

  useEffect(() => {
    fetchProfile();
  }, [user?.id]);

  const updateProfile = async (update: Partial<Profile>): Promise<Profile | null> => {
    if (!user) return null;

    const { data: moderation, error: moderationError } = await supabase.functions.invoke("moderate-text", {
      body: { type: "profile", ...update },
    });

    if (moderationError || moderation?.status !== "approved") {
      console.error("Profile update did not pass moderation", moderationError || moderation?.error);
      return null;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("id,display_name,username,avatar_url,cover_url,bio,location,website,skills,interests,country,onboarded,is_private,created_at,updated_at")
      .eq("id", user.id)
      .single();

    if (error || !data) {
      console.error("Profile passed moderation but could not be reloaded", error);
      return null;
    }

    setProfile(data as Profile);
    return data as Profile;
  };

  const completeOnboarding = async (update: Partial<Profile>): Promise<Profile | null> => {
    return updateProfile({ ...update, onboarded: true });
  };

  const value = useMemo<AppContextValue>(
    () => ({
      currentUserId: user?.id ?? null,
      profile,
      isProfileLoading: !!user && isProfileLoading,
      refreshProfile: fetchProfile,
      updateProfile,
      completeOnboarding,
    }),
    [user?.id, profile, isProfileLoading]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
