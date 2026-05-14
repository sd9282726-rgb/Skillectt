import { useAuth } from "@clerk/expo";
import { Redirect } from "expo-router";
import { View, ActivityIndicator } from "react-native";
import { useAppContext } from "@/context/AppContext";

export default function Index() {
  const { isSignedIn, isLoaded } = useAuth();
  const { currentUserProfile, isLoadingProfile } = useAppContext();

  if (!isLoaded || (isSignedIn && isLoadingProfile)) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#0A0A0F",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator color="#00D4FF" size="large" />
      </View>
    );
  }

  if (!isSignedIn) return <Redirect href="/(auth)/sign-in" />;
  if (!currentUserProfile?.onboardingCompleted)
    return <Redirect href="/(auth)/onboarding" />;
  return <Redirect href="/(tabs)" />;
}
