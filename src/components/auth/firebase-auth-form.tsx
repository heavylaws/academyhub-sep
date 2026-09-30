import { useState } from "react";
import { Mail, Lock, User, Eye, EyeOff, Sparkles, Send, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs.tsx";
import { firebaseAuthService } from "@/services/firebase-auth-service.ts";

export interface FirebaseAuthFormProps {
  onSuccess?: () => void;
}

function parseFirebaseError(error: unknown): string {
  if (!(error instanceof Error)) return "Authentication failed";
  const msg = error.message;
  if (msg.includes("auth/invalid-credential") || msg.includes("auth/wrong-password") || msg.includes("auth/user-not-found")) {
    return "Invalid email or password.";
  }
  if (msg.includes("auth/email-already-in-use")) {
    return "An account with this email address already exists. Please sign in instead.";
  }
  if (msg.includes("auth/weak-password")) {
    return "Password is too weak. Please use at least 6 characters.";
  }
  if (msg.includes("auth/invalid-email")) {
    return "Please enter a valid email address.";
  }
  if (msg.includes("auth/network-request-failed")) {
    return "Network error. Please check your connection.";
  }
  return error.message;
}

export function FirebaseAuthForm({ onSuccess }: FirebaseAuthFormProps) {
  const [activeTab, setActiveTab] = useState<"signin" | "signup" | "forgot">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast.error("Please enter your email and password");
      return;
    }
    setLoading(true);
    try {
      const user = await firebaseAuthService.signIn(email, password);
      if (!user.emailVerified) {
        toast.info("Please verify your email to access your workspace.");
      } else {
        toast.success(`Welcome back, ${user.displayName || user.email}!`);
      }
      onSuccess?.();
    } catch (err) {
      toast.error(parseFirebaseError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      await firebaseAuthService.signUp(email, password, displayName);
      toast.success(
        `Account created! A verification link has been sent to ${email.trim()}. Please verify before signing in.`,
        { duration: 6000 },
      );
      onSuccess?.();
    } catch (err) {
      toast.error(parseFirebaseError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Please enter your email address");
      return;
    }
    setLoading(true);
    try {
      await firebaseAuthService.sendPasswordReset(email);
      toast.success(`Password reset email sent to ${email.trim()}. Check your inbox.`);
      setActiveTab("signin");
    } catch (err) {
      toast.error(parseFirebaseError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md rounded-2xl border border-border/80 bg-card p-6 shadow-xl">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        {activeTab !== "forgot" && (
          <TabsList className="grid w-full grid-cols-2 mb-5">
            <TabsTrigger value="signin">Sign In</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>
        )}

        {/* Sign In Tab */}
        <TabsContent value="signin" className="mt-0">
          <form onSubmit={handleSignIn} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-foreground">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="coach@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="pl-9 text-sm"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-foreground">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setActiveTab("forgot")}
                  className="text-xs text-primary hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="pl-9 pr-9 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-10 gap-2 text-sm font-semibold mt-1"
            >
              <Sparkles className="size-4" />
              {loading ? "Authenticating..." : "Sign In to Academy"}
            </Button>
          </form>
        </TabsContent>

        {/* Sign Up Tab */}
        <TabsContent value="signup" className="mt-0">
          <form onSubmit={handleSignUp} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-foreground">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Coach John Smith"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  autoComplete="name"
                  className="pl-9 text-sm"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-foreground">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="name@academy.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="pl-9 text-sm"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-foreground">
                Create Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  className="pl-9 pr-9 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-foreground">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Repeat password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  className="pl-9 text-sm"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-10 gap-2 text-sm font-semibold mt-1"
            >
              <Send className="size-4" />
              {loading ? "Creating Account..." : "Create Account & Verify"}
            </Button>
          </form>
        </TabsContent>

        {/* Forgot Password Tab */}
        <TabsContent value="forgot" className="mt-0">
          <form onSubmit={handleForgotPassword} className="flex flex-col gap-4">
            <div className="text-sm text-muted-foreground mb-1">
              Enter your registered email address to receive a secure password reset link.
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-foreground">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="your-email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="pl-9 text-sm"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setActiveTab("signin")}
                className="flex-1"
              >
                Back to Sign In
              </Button>
              <Button type="submit" disabled={loading} className="flex-1 gap-1.5">
                {loading ? "Sending..." : "Send Reset Link"}
              </Button>
            </div>
          </form>
        </TabsContent>
      </Tabs>
    </div>
  );
}
