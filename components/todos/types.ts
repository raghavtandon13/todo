export type TodoStatus = "open" | "done";

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
    created_at: string;
    updated_at: string;
};

export type CommentRow = {
    id: string;
    todo_id: string;
    user_id: string;
    body: string;
    author_email: string | null;
    created_at: string;
};
