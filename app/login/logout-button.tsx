// app/logout-button.tsx
"use client";

import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function LogoutButton() {
    const supabase = createClient();
    const router = useRouter();

    async function logout() {
        await supabase.auth.signOut();
        router.refresh();
    }

    return (
        <Button variant="outline" onClick={logout}>
            Logout
        </Button>
    );
}
