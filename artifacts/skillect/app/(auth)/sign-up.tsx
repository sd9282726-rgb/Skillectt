import { useSignUp, useAuth } from "@clerk/expo";
import { Link, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

type Step = "credentials" | "verify";

export default function SignUpPage() {
  const { signUp, errors, fetchStatus } = useSignUp();
  const { isSignedIn } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState<Step>("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");

  const handleSignUp = async () => {
    if (!email || !password) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const { error } = await signUp.password({ emailAddress: email, password });
    if (error) return;

    await signUp.verifications.sendEmailCode();
    setStep("verify");
  };

  const handleVerify = async () => {
    if (!code) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    await signUp.verifications.verifyEmailCode({ code });

    if (signUp.status === "complete") {
      await signUp.finalize({
        navigate: () => {
          router.replace("/(auth)/onboarding");
        },
      });
    }
  };

  if (isSignedIn) {
    router.replace("/");
    return null;
  }

  const isLoading = fetchStatus === "fetching";

  if (step === "verify") {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            {
              paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) + 40,
              paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 32,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.logo}>Skillect</Text>
            <Text style={styles.tagline}>Learn. Build. Share.</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.title}>Verify your email</Text>
            <Text style={styles.subtitle}>
              We sent a code to {email}
            </Text>

            <View style={styles.field}>
              <Text style={styles.label}>Verification Code</Text>
              <TextInput
                style={[styles.input, styles.codeInput]}
                placeholder="000000"
                placeholderTextColor="#444460"
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
              />
              {errors?.fields?.code && (
                <Text style={styles.errorText}>
                  {errors.fields.code.message}
                </Text>
              )}
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.button,
                (isLoading || !code) && styles.buttonDisabled,
                pressed && styles.buttonPressed,
              ]}
              onPress={handleVerify}
              disabled={isLoading || !code}
            >
              {isLoading ? (
                <ActivityIndicator color="#0A0A0F" size="small" />
              ) : (
                <Text style={styles.buttonText}>Verify & Continue</Text>
              )}
            </Pressable>

            <Pressable
              style={styles.resendButton}
              onPress={() => signUp.verifications.sendEmailCode()}
            >
              <Text style={styles.resendText}>Resend code</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) + 40,
            paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 32,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.logo}>Skillect</Text>
          <Text style={styles.tagline}>Learn. Build. Share.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Join Skillect</Text>
          <Text style={styles.subtitle}>
            Start documenting your skill journey
          </Text>

          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="your@email.com"
              placeholderTextColor="#444460"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoCorrect={false}
              returnKeyType="next"
            />
            {errors?.fields?.emailAddress && (
              <Text style={styles.errorText}>
                {errors.fields.emailAddress.message}
              </Text>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Create a password"
              placeholderTextColor="#444460"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              returnKeyType="done"
              onSubmitEditing={handleSignUp}
            />
            {errors?.fields?.password && (
              <Text style={styles.errorText}>
                {errors.fields.password.message}
              </Text>
            )}
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.button,
              (isLoading || !email || !password) && styles.buttonDisabled,
              pressed && styles.buttonPressed,
            ]}
            onPress={handleSignUp}
            disabled={isLoading || !email || !password}
          >
            {isLoading ? (
              <ActivityIndicator color="#0A0A0F" size="small" />
            ) : (
              <Text style={styles.buttonText}>Create Account</Text>
            )}
          </Pressable>

          <View nativeID="clerk-captcha" />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <Link href="/(auth)/sign-in" asChild>
            <Pressable>
              <Text style={styles.footerLink}>Sign in</Text>
            </Pressable>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A0A0F",
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },
  header: {
    alignItems: "center",
    marginBottom: 48,
  },
  logo: {
    fontSize: 36,
    fontFamily: "Inter_700Bold",
    color: "#00D4FF",
    letterSpacing: -1,
  },
  tagline: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#666688",
    marginTop: 4,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  card: {
    backgroundColor: "#12121C",
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: "#1E1E32",
  },
  title: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: "#F0F0FA",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#666688",
    marginBottom: 28,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: "#A0A0C0",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: "#1A1A28",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: "#F0F0FA",
    borderWidth: 1,
    borderColor: "#1E1E32",
  },
  codeInput: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
    letterSpacing: 8,
  },
  button: {
    backgroundColor: "#00D4FF",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  buttonText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "#0A0A0F",
  },
  resendButton: {
    alignItems: "center",
    paddingVertical: 12,
    marginTop: 8,
  },
  resendText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: "#666688",
  },
  errorText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "#FF4444",
    marginTop: 4,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 24,
  },
  footerText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#666688",
  },
  footerLink: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#00D4FF",
  },
});
