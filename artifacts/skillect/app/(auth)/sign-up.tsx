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
import { C } from "@/constants/colors";

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
      await signUp.finalize({ navigate: () => { router.replace("/(auth)/onboarding"); } });
    }
  };

  if (isSignedIn) { router.replace("/"); return null; }

  const isLoading = fetchStatus === "fetching";

  const scrollStyle = {
    paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) + 40,
    paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 32,
  };

  if (step === "verify") {
    return (
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={[styles.scroll, scrollStyle]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.logo}>Skillect</Text>
            <Text style={styles.tagline}>Build In Public · India</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.title}>Verify your email</Text>
            <Text style={styles.subtitle}>We sent a 6-digit code to {email}</Text>
            <View style={styles.field}>
              <Text style={styles.label}>Verification Code</Text>
              <TextInput
                style={[styles.input, styles.codeInput]}
                placeholder="000000"
                placeholderTextColor={C.muted}
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
              />
              {errors?.fields?.code && (
                <Text style={styles.errorText}>{errors.fields.code.message}</Text>
              )}
            </View>
            <Pressable
              style={({ pressed }) => [
                styles.button,
                (isLoading || !code) && styles.buttonDisabled,
                pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
              ]}
              onPress={handleVerify}
              disabled={isLoading || !code}
            >
              {isLoading ? (
                <ActivityIndicator color={C.bg} size="small" />
              ) : (
                <Text style={styles.buttonText}>Verify & Continue</Text>
              )}
            </Pressable>
            <Pressable style={styles.resendButton} onPress={() => signUp.verifications.sendEmailCode()}>
              <Text style={styles.resendText}>Resend code</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={[styles.scroll, scrollStyle]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.logo}>Skillect</Text>
          <Text style={styles.tagline}>Build In Public · India</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Join Skillect</Text>
          <Text style={styles.subtitle}>Start documenting your skill journey</Text>

          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="your@email.com"
              placeholderTextColor={C.muted}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoCorrect={false}
              returnKeyType="next"
            />
            {errors?.fields?.emailAddress && (
              <Text style={styles.errorText}>{errors.fields.emailAddress.message}</Text>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Create a password"
              placeholderTextColor={C.muted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              returnKeyType="done"
              onSubmitEditing={handleSignUp}
            />
            {errors?.fields?.password && (
              <Text style={styles.errorText}>{errors.fields.password.message}</Text>
            )}
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.button,
              (isLoading || !email || !password) && styles.buttonDisabled,
              pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
            ]}
            onPress={handleSignUp}
            disabled={isLoading || !email || !password}
          >
            {isLoading ? (
              <ActivityIndicator color={C.bg} size="small" />
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
  container: { flex: 1, backgroundColor: C.bg },
  scroll: { flexGrow: 1, paddingHorizontal: 24 },
  header: { alignItems: "center", marginBottom: 48 },
  logo: {
    fontSize: 38,
    fontFamily: "Inter_700Bold",
    color: C.primary,
    letterSpacing: -1.5,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
  },
  tagline: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: C.dim,
    marginTop: 6,
    letterSpacing: 2.5,
    textTransform: "uppercase",
  },
  card: {
    backgroundColor: C.card,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: C.border2,
  },
  title: { fontSize: 24, fontFamily: "Inter_700Bold", color: C.text, marginBottom: 6 },
  subtitle: { fontSize: 14, fontFamily: "Inter_400Regular", color: C.dim, marginBottom: 28 },
  field: { marginBottom: 16 },
  label: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: C.subtext,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: C.inputBg,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: C.text,
    borderWidth: 1,
    borderColor: C.border2,
  },
  codeInput: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
    letterSpacing: 10,
    color: C.primary,
  },
  button: {
    backgroundColor: C.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
  },
  buttonDisabled: { opacity: 0.4, shadowColor: "transparent" },
  buttonText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: C.bg },
  resendButton: { alignItems: "center", paddingVertical: 12, marginTop: 8 },
  resendText: { fontSize: 14, fontFamily: "Inter_500Medium", color: C.dim },
  errorText: { fontSize: 12, fontFamily: "Inter_400Regular", color: C.danger, marginTop: 4 },
  footer: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: 24 },
  footerText: { fontSize: 14, fontFamily: "Inter_400Regular", color: C.dim },
  footerLink: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: C.primary },
});
