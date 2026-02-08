import { LogoutButton } from "@/components/auth/logout-button";
import { createClient } from "../../lib/supabase/server";
import LoginButton from "./login-button";

export default async function Page() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return (
            <div>
                <p>
                    Status: <strong>Not logged in</strong>
                </p>
                <LoginButton />
            </div>
        );
    }

    return (
        <div>
            <p>
                Status: <strong>Logged in</strong>
            </p>

            <div style={{ marginBottom: 12 }}>
                <p>
                    <strong>User ID:</strong> {user.id}
                </p>
                <p>
                    <strong>Email:</strong> {user.email}
                </p>
                <p>
                    <strong>Role:</strong> {user.role}
                </p>
            </div>

            <LogoutButton />
        </div>
    );
}
