"use client";

import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export function LogoutButton({ className }: { className?: string }) {
    const supabase = createClient();
    const router = useRouter();

    async function logout() {
        await supabase.auth.signOut();
        router.refresh();
    }

    return (
        <Button className={className} onClick={logout} variant="outline">
            Logout
        </Button>
    );
}
