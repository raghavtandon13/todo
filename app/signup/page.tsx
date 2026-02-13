"use client";

import { GithubLogoIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const router = useRouter();
    const supabase = createClient();

    async function handleSignup(e: React.FormEvent) {
        e.preventDefault();
        setError(null);

        if (password !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        if (password.length < 6) {
            setError("Password must be at least 6 characters");
            return;
        }

        setLoading(true);

        try {
            const { error } = await supabase.auth.signUp({
                email,
                password,
                options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
            });

            if (error) setError(error.message);
            else setSuccess(true);
        } catch {
            setError("An unexpected error occurred");
        } finally {
            setLoading(false);
        }
    }

    async function handleGitHubLogin() {
        setLoading(true);
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: "github",
                options: { redirectTo: window.location.origin },
            });
            if (error) setError(error.message);
	    router.refresh();
        } catch {
            setError("An unexpected error occurred");
        } finally {
            setLoading(false);
        }
    }

    if (success) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background p-4">
                <Card className="w-full max-w-md">
                    <CardHeader className="space-y-1">
                        <CardTitle className="font-bold text-2xl">Check your email</CardTitle>
                        <CardDescription>
                            We&apos;ve sent you a confirmation email. Please click the link in the email to complete
                            your registration.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button className="w-full" onClick={() => router.push("/login")} variant="outline">
                            Back to Login
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="space-y-1">
                    <CardTitle className="font-bold text-2xl">Create an account</CardTitle>
                    <CardDescription>Enter your email and password to create your account</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {error && <div className="rounded-md bg-red-50 p-3 text-red-500 text-sm">{error}</div>}

                    <form className="space-y-4" onSubmit={handleSignup}>
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="name@example.com"
                                required
                                type="email"
                                value={email}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                type="password"
                                value={password}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="confirm-password">Confirm Password</Label>
                            <Input
                                id="confirm-password"
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                type="password"
                                value={confirmPassword}
                            />
                        </div>
                        <Button className="w-full" disabled={loading} type="submit">
                            {loading ? "Creating account..." : "Sign Up"}
                        </Button>
                    </form>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
                        </div>
                    </div>

                    <Button className="w-full" disabled={loading} onClick={handleGitHubLogin} variant="outline">
                        <GithubLogoIcon /> GitHub
                    </Button>
                </CardContent>
                <CardFooter className="flex flex-col space-y-2">
                    <div className="text-center text-muted-foreground text-sm">
                        Already have an account?{" "}
                        <Link className="text-primary hover:underline" href="/login">
                            Sign in
                        </Link>
                    </div>
                </CardFooter>
            </Card>
        </div>
    );
}
