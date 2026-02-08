export type TodoStatus = "open" | "done";
export type TodoVisibility = "private" | "team";
export type TeamRole = "admin" | "member";

export type Team = {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    created_by: string;
    created_at: string;
    updated_at: string;
};

export type TeamMember = {
    id: string;
    team_id: string;
    user_id: string;
    role: TeamRole;
    invited_by: string | null;
    joined_at: string;
    user_email?: string;
};

export type TeamWithMembers = Team & {
    members: (TeamMember & { user_email: string })[];
    is_admin: boolean;
};

export type TodoRow = {
    id: string;
    user_id: string;
    title: string;
    description: string | null;
    status: TodoStatus;
    archived: boolean;
    priority: 1 | 2 | 3;
    due_on: string | null;
    author_email: string | null;
    team_id: string | null;
    visibility: TodoVisibility;
    created_at: string;
    updated_at: string;
    team?: Team;
};

export type CommentRow = {
    id: string;
    todo_id: string;
    user_id: string;
    body: string;
    author_email: string | null;
    created_at: string;
};
