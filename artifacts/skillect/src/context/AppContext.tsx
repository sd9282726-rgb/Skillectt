import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useUser } from "@clerk/react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetMyProfile,
  useUpdateMyProfile,
  useCompleteOnboarding,
  getGetMyProfileQueryKey,
  type Profile,
  type ProfileUpdate,
} from "@workspace/api-client-react";

const MY_PROFILE_QUERY_KEY = getGetMyProfileQueryKey();

interface AppContextValue {
  currentUserId: string | null;
  profile: Profile | undefined;
  isProfileLoading: boolean;
  updateProfile: (update: ProfileUpdate) => Promise<Profile>;
  completeOnboarding: (update: ProfileUpdate) => Promise<Profile>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const { user, isSignedIn } = useUser();
  const queryClient = useQueryClient();

  const { data: profile, isLoading } = useGetMyProfile({
    query: { queryKey: MY_PROFILE_QUERY_KEY, enabled: !!isSignedIn },
  });

  const updateMutation = useUpdateMyProfile();
  const onboardMutation = useCompleteOnboarding();

  const updateProfile = async (update: ProfileUpdate): Promise<Profile> => {
    const result = await updateMutation.mutateAsync({ data: update });
    queryClient.setQueryData(MY_PROFILE_QUERY_KEY, result);
    return result;
  };

  const completeOnboarding = async (update: ProfileUpdate): Promise<Profile> => {
    const result = await onboardMutation.mutateAsync({ data: update });
    queryClient.setQueryData(MY_PROFILE_QUERY_KEY, result);
    return result;
  };

  const value = useMemo<AppContextValue>(
    () => ({
      currentUserId: isSignedIn ? (user?.id ?? null) : null,
      profile: isSignedIn ? profile : undefined,
      isProfileLoading: !!isSignedIn && isLoading,
      updateProfile,
      completeOnboarding,
    }),
    [isSignedIn, user?.id, profile, isLoading],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
