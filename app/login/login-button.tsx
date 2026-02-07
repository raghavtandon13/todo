// app/login-button.tsx
"use client";

import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

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
