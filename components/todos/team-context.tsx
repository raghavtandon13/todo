"use client";

import * as React from "react";
import { createClient } from "@/lib/supabase/client";
import type { Team, TeamMember, TeamRole, TeamWithMembers } from "./types";

interface TeamContextType {
    teams: TeamWithMembers[];
    selectedTeamId: string | null;
    setSelectedTeamId: (teamId: string | null) => void;
    isLoading: boolean;
    error: string | null;
    refreshTeams: () => Promise<void>;
    createTeam: (name: string, description?: string) => Promise<Team | null>;
    inviteMember: (teamId: string, email: string, role?: TeamRole) => Promise<boolean>;
    removeMember: (teamId: string, userId: string) => Promise<boolean>;
    leaveTeam: (teamId: string) => Promise<boolean>;
    userId: string;
}

const TeamContext = React.createContext<TeamContextType | undefined>(undefined);

export function TeamProvider({
    children,
    initialTeams = [],
    userId,
}: {
    children: React.ReactNode;
    initialTeams?: TeamWithMembers[];
    userId: string;
}) {
    const supabase = React.useMemo(() => createClient(), []);
    const [teams, setTeams] = React.useState<TeamWithMembers[]>(initialTeams);
    const [selectedTeamId, setSelectedTeamId] = React.useState<string | null>(null);
    const [isLoading, setIsLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);

    const refreshTeams = React.useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            // Fetch teams where user is member or creator
            const { data: teamsData, error: teamsError } = await supabase
                .from("teams")
                .select(`
                    *,
                    team_members(*)
                `)
                .order("created_at", { ascending: false });

            if (teamsError) throw teamsError;

            // Get user emails for members
            const memberUserIds =
                teamsData?.flatMap((t: any) => t.team_members?.map((m: any) => m.user_id) || []) || [];

            const uniqueUserIds = [...new Set(memberUserIds)];

            // Fetch user emails from auth.users (this requires admin privileges or a separate table)
            // For now, we'll use a simpler approach with the author_email stored in team_members
            const teamsWithMembers: TeamWithMembers[] = (teamsData || []).map((team: any) => ({
                ...team,
                members:
                    team.team_members?.map((m: any) => ({
                        ...m,
                        user_email: m.user_email || "Unknown",
                    })) || [],
                is_admin:
                    team.created_by === userId ||
                    team.team_members?.some((m: any) => m.user_id === userId && m.role === "admin"),
            }));

            setTeams(teamsWithMembers);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load teams");
        } finally {
            setIsLoading(false);
        }
    }, [supabase, userId]);

    const createTeam = React.useCallback(
        async (name: string, description?: string): Promise<Team | null> => {
            try {
                const { data, error } = await supabase
                    .from("teams")
                    .insert({
                        name,
                        description: description || null,
                        created_by: userId,
                    })
                    .select()
                    .single();

                if (error) throw error;

                // Add creator as admin member
                await supabase.from("team_members").insert({
                    team_id: data.id,
                    user_id: userId,
                    role: "admin",
                    invited_by: userId,
                });

                await refreshTeams();
                return data;
            } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to create team");
                return null;
            }
        },
        [supabase, userId, refreshTeams],
    );

    const inviteMember = React.useCallback(
        async (teamId: string, email: string, role: TeamRole = "member"): Promise<boolean> => {
            try {
                // First, find the user by email
                const { data: userData, error: userError } = await supabase
                    .from("users")
                    .select("id")
                    .eq("email", email)
                    .single();

                if (userError || !userData) {
                    setError("User not found with that email");
                    return false;
                }

                const { error } = await supabase.from("team_members").insert({
                    team_id: teamId,
                    user_id: userData.id,
                    role,
                    invited_by: userId,
                });

                if (error) throw error;

                await refreshTeams();
                return true;
            } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to invite member");
                return false;
            }
        },
        [supabase, userId, refreshTeams],
    );

    const removeMember = React.useCallback(
        async (teamId: string, memberUserId: string): Promise<boolean> => {
            try {
                const { error } = await supabase
                    .from("team_members")
                    .delete()
                    .eq("team_id", teamId)
                    .eq("user_id", memberUserId);

                if (error) throw error;

                await refreshTeams();
                return true;
            } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to remove member");
                return false;
            }
        },
        [supabase, refreshTeams],
    );

    const leaveTeam = React.useCallback(
        async (teamId: string): Promise<boolean> => {
            try {
                const { error } = await supabase
                    .from("team_members")
                    .delete()
                    .eq("team_id", teamId)
                    .eq("user_id", userId);

                if (error) throw error;

                if (selectedTeamId === teamId) {
                    setSelectedTeamId(null);
                }

                await refreshTeams();
                return true;
            } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to leave team");
                return false;
            }
        },
        [supabase, userId, selectedTeamId, refreshTeams],
    );

    const value = React.useMemo(
        () => ({
            teams,
            selectedTeamId,
            setSelectedTeamId,
            isLoading,
            error,
            refreshTeams,
            createTeam,
            inviteMember,
            removeMember,
            leaveTeam,
            userId,
        }),
        [
            teams,
            selectedTeamId,
            isLoading,
            error,
            refreshTeams,
            createTeam,
            inviteMember,
            removeMember,
            leaveTeam,
            userId,
        ],
    );

    return <TeamContext.Provider value={value}>{children}</TeamContext.Provider>;
}

export function useTeams() {
    const context = React.useContext(TeamContext);
    if (context === undefined) {
        throw new Error("useTeams must be used within a TeamProvider");
    }
    return context;
}
