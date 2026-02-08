// app/login-button.tsx
"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createClient } from "../../lib/supabase/client";

export default function LoginButton() {
    const supabase = createClient();
    const router = useRouter();

    async function login() {
        await supabase.auth.signInWithPassword({
            email: "you2@email.com",
            password: "password",
        });

        router.refresh(); // 👈 re-run server components
    }

    return <Button onClick={login}>Login</Button>;
}
