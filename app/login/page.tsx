"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { GithubLogoIcon } from "@phosphor-icons/react";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const supabase = createClient();

    async function handleLogin(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) {
                setError(error.message);
            } else {
                router.push("/");
                router.refresh();
            }
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
                options: { redirectTo: "http://localhost:3000" },
            });
            if (error) {
                setError(error.message);
            }
        } catch {
            setError("An unexpected error occurred");
        } finally {
            setLoading(false);
            router.refresh();
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="space-y-1">
                    <CardTitle className="font-bold text-2xl">Welcome back</CardTitle>
                    <CardDescription>Enter your email and password to sign in to your account</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {error && <div className="rounded-md bg-red-50 p-3 text-red-500 text-sm">{error}</div>}

                    <form className="space-y-4" onSubmit={handleLogin}>
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
                        <Button className="w-full" disabled={loading} type="submit">
                            {loading ? "Signing in..." : "Sign In"}
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
                        Don&apos;t have an account?{" "}
                        <Link className="text-primary hover:underline" href="/signup">
                            Sign up
                        </Link>
                    </div>
                </CardFooter>
            </Card>
        </div>
    );
}
