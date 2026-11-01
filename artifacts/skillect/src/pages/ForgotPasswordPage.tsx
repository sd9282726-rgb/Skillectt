import { useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await resetPassword(email.trim());

    if (error) {
      setError(error.message || "Failed to send reset email");
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  };

  if (success) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-white px-4">
        <div className="w-full max-w-md space-y-6 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Check your email</h1>
          <p className="text-gray-600">
            If an account exists for <strong>{email}</strong>, you will receive a password reset link shortly.
          </p>
          <Link href="/sign-in">
            <Button className="w-full bg-blue-600 hover:bg-blue-700">Back to Sign in</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-white px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Reset password</h1>
          <p className="mt-2 text-sm text-gray-600">
            Enter your email and we'll send you a reset link
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-11"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="h-11 w-full bg-blue-600 hover:bg-blue-700"
          >
            {loading ? "Sending…" : "Send reset link"}
          </Button>
        </form>

        <p className="text-center text-sm text-gray-600">
          <Link href="/sign-in" className="font-medium text-blue-600 hover:text-blue-500">
            Back to Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
