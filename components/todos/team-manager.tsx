"use client";

import {
    CrownIcon,
    LogOutIcon,
    PlusIcon,
    SettingsIcon,
    TrashIcon,
    UserPlusIcon,
    UsersIcon,
} from "@phosphor-icons/react";
import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useTeams } from "./team-context";
import type { TeamWithMembers } from "./types";

export function TeamSelector() {
    const { teams, selectedTeamId, setSelectedTeamId, isLoading } = useTeams();
    const selectedTeam = teams.find((t) => t.id === selectedTeamId);

    if (isLoading) {
        return <Badge variant="outline">Loading teams...</Badge>;
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button className="gap-2" variant="outline">
                    <UsersIcon className="size-4" />
                    {selectedTeam ? selectedTeam.name : "Personal"}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => setSelectedTeamId(null)}>
                    <span className={cn("flex-1", !selectedTeamId && "font-medium")}>Personal</span>
                    {!selectedTeamId && <Badge variant="secondary">Active</Badge>}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {teams.length === 0 ? (
                    <DropdownMenuItem disabled>No teams yet</DropdownMenuItem>
                ) : (
                    teams.map((team) => (
                        <DropdownMenuItem key={team.id} onClick={() => setSelectedTeamId(team.id)}>
                            <span className={cn("flex-1", selectedTeamId === team.id && "font-medium")}>
                                {team.name}
                            </span>
                            {selectedTeamId === team.id && <Badge variant="secondary">Active</Badge>}
                        </DropdownMenuItem>
                    ))
                )}
                <DropdownMenuSeparator />
                <TeamDialog />
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

function TeamDialog() {
    const [open, setOpen] = React.useState(false);

    return (
        <Dialog onOpenChange={setOpen} open={open}>
            <DialogTrigger asChild>
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    <PlusIcon className="mr-2 size-4" />
                    Create or manage teams
                </DropdownMenuItem>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Teams</DialogTitle>
                    <DialogDescription>Create teams and manage members to collaborate on todos.</DialogDescription>
                </DialogHeader>
                <TeamManager onClose={() => setOpen(false)} />
            </DialogContent>
        </Dialog>
    );
}

function TeamManager({ onClose }: { onClose: () => void }) {
    const { teams, createTeam, isLoading, error } = useTeams();
    const [newTeamName, setNewTeamName] = React.useState("");
    const [newTeamDescription, setNewTeamDescription] = React.useState("");
    const [isCreating, setIsCreating] = React.useState(false);

    async function handleCreateTeam(e: React.FormEvent) {
        e.preventDefault();
        if (!newTeamName.trim()) return;

        setIsCreating(true);
        const team = await createTeam(newTeamName.trim(), newTeamDescription.trim() || undefined);
        setIsCreating(false);

        if (team) {
            setNewTeamName("");
            setNewTeamDescription("");
        }
    }

    return (
        <Tabs className="w-full" defaultValue="teams">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="teams">My Teams</TabsTrigger>
                <TabsTrigger value="create">Create Team</TabsTrigger>
            </TabsList>

            <TabsContent className="space-y-4" value="teams">
                {error && (
                    <div className="rounded border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
                        {error}
                    </div>
                )}

                {teams.length === 0 ? (
                    <div className="py-8 text-center text-sm text-muted-foreground">
                        No teams yet. Create your first team to start collaborating!
                    </div>
                ) : (
                    <div className="space-y-3">
                        {teams.map((team) => (
                            <TeamCard key={team.id} team={team} />
                        ))}
                    </div>
                )}
            </TabsContent>

            <TabsContent value="create">
                <form className="space-y-4" onSubmit={handleCreateTeam}>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Team Name</label>
                        <Input
                            onChange={(e) => setNewTeamName(e.target.value)}
                            placeholder="Engineering Team"
                            required
                            value={newTeamName}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Description (optional)</label>
                        <Input
                            onChange={(e) => setNewTeamDescription(e.target.value)}
                            placeholder="What does this team work on?"
                            value={newTeamDescription}
                        />
                    </div>
                    <DialogFooter>
                        <Button onClick={onClose} type="button" variant="outline">
                            Cancel
                        </Button>
                        <Button disabled={isCreating || !newTeamName.trim()} type="submit">
                            {isCreating ? "Creating..." : "Create Team"}
                        </Button>
                    </DialogFooter>
                </form>
            </TabsContent>
        </Tabs>
    );
}

function TeamCard({ team }: { team: TeamWithMembers }) {
    const { inviteMember, removeMember, leaveTeam, userId } = useTeams();
    const [isInviting, setIsInviting] = React.useState(false);
    const [inviteEmail, setInviteEmail] = React.useState("");
    const [showInviteForm, setShowInviteForm] = React.useState(false);

    async function handleInvite(e: React.FormEvent) {
        e.preventDefault();
        if (!inviteEmail.trim()) return;

        setIsInviting(true);
        const success = await inviteMember(team.id, inviteEmail.trim());
        setIsInviting(false);

        if (success) {
            setInviteEmail("");
            setShowInviteForm(false);
        }
    }

    return (
        <div className="rounded-lg border p-4">
            <div className="flex items-start justify-between">
                <div>
                    <h4 className="font-medium">{team.name}</h4>
                    {team.description && <p className="mt-1 text-sm text-muted-foreground">{team.description}</p>}
                    <div className="mt-2 flex items-center gap-2">
                        <Badge variant="secondary">
                            <UsersIcon className="mr-1 size-3" />
                            {team.members.length} members
                        </Badge>
                        {team.is_admin && (
                            <Badge variant="outline">
                                <CrownIcon className="mr-1 size-3" />
                                Admin
                            </Badge>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    {team.is_admin && (
                        <Button
                            onClick={() => setShowInviteForm(!showInviteForm)}
                            size="icon"
                            title="Invite member"
                            variant="ghost"
                        >
                            <UserPlusIcon className="size-4" />
                        </Button>
                    )}
                    <Button onClick={() => leaveTeam(team.id)} size="icon" title="Leave team" variant="ghost">
                        <LogOutIcon className="size-4" />
                    </Button>
                </div>
            </div>

            {showInviteForm && team.is_admin && (
                <form className="mt-4 flex gap-2" onSubmit={handleInvite}>
                    <Input
                        className="flex-1"
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder="Email address"
                        required
                        type="email"
                        value={inviteEmail}
                    />
                    <Button disabled={isInviting || !inviteEmail.trim()} type="submit">
                        {isInviting ? "..." : "Invite"}
                    </Button>
                    <Button onClick={() => setShowInviteForm(false)} type="button" variant="ghost">
                        Cancel
                    </Button>
                </form>
            )}

            {team.members.length > 0 && (
                <div className="mt-4 space-y-2">
                    <h5 className="text-xs font-medium text-muted-foreground">Members</h5>
                    <div className="space-y-1">
                        {team.members.map((member) => (
                            <div
                                className="flex items-center justify-between rounded bg-muted/50 px-3 py-2 text-sm"
                                key={member.id}
                            >
                                <div className="flex items-center gap-2">
                                    <span className="truncate">{member.user_email || "Unknown"}</span>
                                    {member.role === "admin" && (
                                        <Badge className="text-xs" variant="outline">
                                            Admin
                                        </Badge>
                                    )}
                                </div>
                                {team.is_admin && member.user_id !== team.created_by && (
                                    <Button
                                        className="size-6"
                                        onClick={() => removeMember(team.id, member.user_id)}
                                        size="icon"
                                        title="Remove member"
                                        variant="ghost"
                                    >
                                        <TrashIcon className="size-3" />
                                    </Button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
