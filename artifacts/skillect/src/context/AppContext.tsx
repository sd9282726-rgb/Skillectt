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
  email?: string | null;
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
  const [isProfileLoading, setIsProfileLoading] = useState(false);

  const fetchProfile = async () => {
    if (!user) {
      setProfile(undefined);
      return;
    }

    setIsProfileLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (!error && data) {
      setProfile(data as Profile);
    } else {
      setProfile(undefined);
    }
    setIsProfileLoading(false);
  };

  useEffect(() => {
    fetchProfile();
  }, [user?.id]);

  const updateProfile = async (update: Partial<Profile>): Promise<Profile | null> => {
    if (!user) return null;

    const { data, error } = await supabase
      .from("profiles")
      .update(update)
      .eq("id", user.id)
      .select()
      .single();

    if (error) {
      console.error("Failed to update profile", error);
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
