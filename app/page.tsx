import { redirect } from "next/navigation";

import { TeamProvider } from "@/components/todos/team-context";
import { TodoApp } from "@/components/todos/todo-app";
import type { Team, TeamMember, TeamWithMembers, TodoRow } from "@/components/todos/types";
import { createClient } from "@/lib/supabase/server";

interface TeamWithMembersData extends Team {
    team_members: (TeamMember & { user_email?: string })[];
}

export default async function Page() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    // Fetch todos with team info
    const { data: todosData, error: todosError } = await supabase
        .from("todos")
        .select(`
      *,
      team:teams(id, name, slug)
    `)
        .order("created_at", { ascending: false });

    // Fetch teams with members
    const { data: teamsData, error: teamsError } = await supabase
        .from("teams")
        .select(`
      *,
      team_members(*)
    `)
        .order("created_at", { ascending: false });

    // Process teams with member info
    const teamsWithMembers: TeamWithMembers[] = ((teamsData as TeamWithMembersData[]) || []).map((team) => ({
        ...team,
        members:
            team.team_members?.map((m) => ({
                ...m,
                user_email: m.user_email || "Unknown",
            })) || [],
        is_admin:
            team.created_by === user.id || team.team_members?.some((m) => m.user_id === user.id && m.role === "admin"),
    }));

    return (
        <TeamProvider initialTeams={teamsWithMembers} userId={user.id}>
            <TodoApp
                initialLoadError={todosError?.message ?? teamsError?.message ?? null}
                initialTodos={(todosData as TodoRow[]) ?? []}
                userEmail={user.email ?? ""}
                userId={user.id}
            />
        </TeamProvider>
    );
}
