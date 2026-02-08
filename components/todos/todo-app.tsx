"use client";

import {
    ArchiveIcon,
    ArrowCounterClockwiseIcon,
    CalendarIcon,
    CheckCircleIcon,
    ClipboardTextIcon,
    DotsThreeVerticalIcon,
    MagnifyingGlassIcon,
    PencilSimpleIcon,
    PlusIcon,
    TrashIcon,
    XCircleIcon,
} from "@phosphor-icons/react";
import * as React from "react";
import type { CommentRow, TodoRow } from "@/components/todos/types";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogMedia,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardAction,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

function formatDateTime(iso: string) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    });
}

export function TodoApp({
    initialTodos,
    initialLoadError,
    userId,
    userEmail,
}: {
    initialTodos: TodoRow[];
    initialLoadError?: string | null;
    userId: string;
    userEmail: string;
}) {
    const supabase = React.useMemo(() => createClient(), []);

    const [todos, setTodos] = React.useState<TodoRow[]>(initialTodos);
    const [selectedTodoId, setSelectedTodoId] = React.useState<string | null>(initialTodos[0]?.id ?? null);
    const [scope, setScope] = React.useState<"active" | "archived">("active");
    const [query, setQuery] = React.useState("");
    const [loadError, setLoadError] = React.useState<string | null>(initialLoadError ?? null);

    const [newTitle, setNewTitle] = React.useState("");
    const [newDescription, setNewDescription] = React.useState("");
    const [isCreating, startCreating] = React.useTransition();

    const selected = React.useMemo(() => todos.find((t) => t.id === selectedTodoId) ?? null, [todos, selectedTodoId]);

    const filteredTodos = React.useMemo(() => {
        const q = query.trim().toLowerCase();
        return todos
            .filter((t) => (scope === "archived" ? t.archived : !t.archived))
            .filter((t) => {
                if (!q) return true;
                return `${t.title} ${t.description ?? ""}`.toLowerCase().includes(q);
            })
            .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    }, [todos, scope, query]);

    async function refreshTodos() {
        const { data, error } = await supabase.from("todos").select("*").order("created_at", { ascending: false });

        if (error) {
            setLoadError(error.message);
            return;
        }

        setLoadError(null);
        setTodos((data as TodoRow[]) ?? []);
    }

    function ensureSelectedVisible(nextTodos: TodoRow[]) {
        if (!selectedTodoId) return;
        const stillExists = nextTodos.some((t) => t.id === selectedTodoId);
        if (!stillExists) {
            setSelectedTodoId(nextTodos[0]?.id ?? null);
        }
    }

    async function createTodo() {
        const title = newTitle.trim();
        const description = newDescription.trim();
        if (!title) return;

        setLoadError(null);

        const { data, error } = await supabase
            .from("todos")
            .insert({
                user_id: userId,
                author_email: userEmail,
                title,
                description: description ? description : null,
                status: "open" as const,
                archived: false,
            })
            .select("*")
            .single();

        if (error) {
            setLoadError(error.message);
            return;
        }

        const row = data as TodoRow;
        setTodos((prev) => [row, ...prev]);
        setSelectedTodoId(row.id);
        setNewTitle("");
        setNewDescription("");
    }

    async function updateTodo(
        id: string,
        patch: Partial<Pick<TodoRow, "title" | "description" | "status" | "archived">>,
    ) {
        setLoadError(null);
        const { data, error } = await supabase.from("todos").update(patch).eq("id", id).select("*").single();
        if (error) {
            setLoadError(error.message);
            return;
        }
        const row = data as TodoRow;
        setTodos((prev) => {
            const next = prev.map((t) => (t.id === id ? row : t));
            ensureSelectedVisible(next);
            return next;
        });
    }

    async function deleteTodo(id: string) {
        setLoadError(null);

        const { error } = await supabase.from("todos").delete().eq("id", id);
        if (error) {
            setLoadError(error.message);
            return;
        }

        setTodos((prev) => {
            const next = prev.filter((t) => t.id !== id);
            ensureSelectedVisible(next);
            return next;
        });
    }

    return (
        <div className="min-h-screen bg-[radial-gradient(1200px_600px_at_10%_10%,color-mix(in_oklab,var(--primary)_18%,transparent),transparent),radial-gradient(1000px_500px_at_85%_30%,color-mix(in_oklab,var(--chart-1)_18%,transparent),transparent)]">
            <div className="mx-auto w-full max-w-6xl p-4 sm:p-6 lg:p-10">
                <header className="mb-4 flex flex-wrap items-center gap-2 sm:mb-6">
                    <div className="flex items-center gap-2">
                        <div className="ring-foreground/10 bg-background grid size-8 place-items-center rounded-none ring-1">
                            <ClipboardTextIcon className="size-4" />
                        </div>
                        <div>
                            <div className="text-base font-medium leading-none">Todo Studio</div>
                            <div className="text-muted-foreground mt-1 text-xs">Add, edit, archive, comment</div>
                        </div>
                    </div>
                    <div className="ml-auto flex flex-wrap items-center gap-2">
                        <Badge variant="secondary">{userEmail}</Badge>
                        <Button onClick={refreshTodos} size="default" variant="outline">
                            <ArrowCounterClockwiseIcon data-icon="inline-start" />
                            Refresh
                        </Button>
                    </div>
                </header>

                {loadError ? (
                    <Card className="mb-4">
                        <CardHeader>
                            <CardTitle>Supabase error</CardTitle>
                            <CardDescription>
                                {loadError}
                                {loadError.toLowerCase().includes("relation") ? (
                                    <span>
                                        {" "}
                                        (If you haven&apos;t created the tables yet, run `supabase/todo_schema.sql` in
                                        the SQL editor.)
                                    </span>
                                ) : null}
                            </CardDescription>
                        </CardHeader>
                    </Card>
                ) : null}

                <div className="grid gap-4 md:grid-cols-[380px_1fr]">
                    <Card className="animate-in fade-in-0 zoom-in-95 duration-200">
                        <CardHeader className="border-b">
                            <CardTitle>Todos</CardTitle>
                            <CardDescription>
                                {scope === "active" ? "Working set" : "Archived items"} • {filteredTodos.length}
                            </CardDescription>
                            <CardAction>
                                <div className="flex items-center gap-1">
                                    <Button
                                        onClick={() => setScope("active")}
                                        size="sm"
                                        variant={scope === "active" ? "default" : "outline"}
                                    >
                                        Active
                                    </Button>
                                    <Button
                                        onClick={() => setScope("archived")}
                                        size="sm"
                                        variant={scope === "archived" ? "default" : "outline"}
                                    >
                                        Archived
                                    </Button>
                                </div>
                            </CardAction>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <InputGroup>
                                <InputGroupAddon>
                                    <InputGroupText>
                                        <MagnifyingGlassIcon />
                                    </InputGroupText>
                                </InputGroupAddon>
                                <InputGroupInput
                                    onChange={(e) => setQuery(e.target.value)}
                                    placeholder="Search todos"
                                    value={query}
                                />
                            </InputGroup>

                            <div className="space-y-2">
                                <div className="text-muted-foreground text-xs font-medium">New todo</div>
                                <div className="space-y-2">
                                    <Input
                                        onChange={(e) => setNewTitle(e.target.value)}
                                        placeholder="Title (e.g. Ship comments UI)"
                                        value={newTitle}
                                    />
                                    <Textarea
                                        onChange={(e) => setNewDescription(e.target.value)}
                                        placeholder="Optional notes"
                                        rows={3}
                                        value={newDescription}
                                    />
                                    <div className="flex items-center gap-2">
                                        <Button
                                            disabled={isCreating || !newTitle.trim()}
                                            onClick={() => startCreating(createTodo)}
                                        >
                                            <PlusIcon data-icon="inline-start" />
                                            Add
                                        </Button>
                                        <Button
                                            disabled={isCreating && (!!newTitle || !!newDescription)}
                                            onClick={() => {
                                                setNewTitle("");
                                                setNewDescription("");
                                            }}
                                            variant="outline"
                                        >
                                            Clear
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            <Separator />

                            <div className="space-y-1">
                                {filteredTodos.length === 0 ? (
                                    <div className="text-muted-foreground py-10 text-center text-xs">
                                        No todos in this view.
                                    </div>
                                ) : null}

                                {filteredTodos.map((todo) => (
                                    <TodoListItem
                                        active={todo.id === selectedTodoId}
                                        key={todo.id}
                                        onArchive={() => updateTodo(todo.id, { archived: true })}
                                        onDelete={() => deleteTodo(todo.id)}
                                        onSelect={() => setSelectedTodoId(todo.id)}
                                        onToggleDone={() =>
                                            updateTodo(todo.id, {
                                                status: todo.status === "done" ? "open" : "done",
                                            })
                                        }
                                        onUnarchive={() => updateTodo(todo.id, { archived: false })}
                                        todo={todo}
                                    />
                                ))}
                            </div>
                        </CardContent>
                        <CardFooter className="text-muted-foreground text-xs">
                            Tip: use the menu on each item for actions.
                        </CardFooter>
                    </Card>

                    <TodoDetails
                        key={selectedTodoId ?? "empty"}
                        onDelete={() => (selected ? deleteTodo(selected.id) : Promise.resolve())}
                        onPatch={(patch) => (selected ? updateTodo(selected.id, patch) : Promise.resolve())}
                        supabase={supabase}
                        todo={selected}
                        userEmail={userEmail}
                        userId={userId}
                    />
                </div>
            </div>
        </div>
    );
}

function TodoListItem({
    todo,
    active,
    onSelect,
    onToggleDone,
    onArchive,
    onUnarchive,
    onDelete,
}: {
    todo: TodoRow;
    active: boolean;
    onSelect: () => void;
    onToggleDone: () => void;
    onArchive: () => void;
    onUnarchive: () => void;
    onDelete: () => void;
}) {
    return (
        <div
            className={cn(
                "ring-foreground/10 hover:bg-muted/40 group flex items-start gap-2 rounded-none p-2 ring-1 transition-colors",
                active ? "bg-muted/40" : "bg-background",
            )}
        >
            <button
                aria-label={todo.status === "done" ? "Mark as open" : "Mark as done"}
                className={cn(
                    "mt-0.5 grid size-5 place-items-center rounded-none border",
                    todo.status === "done" ? "bg-primary text-primary-foreground border-transparent" : "border-border",
                )}
                onClick={onToggleDone}
                type="button"
            >
                {todo.status === "done" ? <CheckCircleIcon className="size-4" /> : null}
            </button>

            <button
                aria-current={active ? "true" : undefined}
                className="min-w-0 flex-1 text-left"
                onClick={onSelect}
                type="button"
            >
                <div className="flex items-start gap-2">
                    <div
                        className={cn(
                            "min-w-0 flex-1 truncate text-xs font-medium",
                            todo.archived ? "opacity-70" : null,
                        )}
                    >
                        {todo.title}
                    </div>
                    {todo.archived ? <Badge variant="secondary">Archived</Badge> : null}
                    {todo.status === "done" ? <Badge variant="secondary">Done</Badge> : null}
                </div>
                {todo.description ? (
                    <div className="text-muted-foreground mt-1 line-clamp-2 text-xs">{todo.description}</div>
                ) : null}
                <div className="text-muted-foreground mt-1 flex items-center gap-2 text-[11px]">
                    <span className="truncate">{todo.author_email ?? ""}</span>
                    <span aria-hidden="true">•</span>
                    <span className="truncate">{formatDateTime(todo.created_at)}</span>
                </div>
            </button>

            <DropdownMenu>
                <DropdownMenuTrigger render={<Button size="icon" variant="ghost" />}>
                    <DotsThreeVerticalIcon />
                    <span className="sr-only">Todo actions</span>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuItem onClick={onToggleDone}>
                        {todo.status === "done" ? <XCircleIcon /> : <CheckCircleIcon />}
                        {todo.status === "done" ? "Mark open" : "Mark done"}
                    </DropdownMenuItem>
                    {todo.archived ? (
                        <DropdownMenuItem onClick={onUnarchive}>
                            <ArrowCounterClockwiseIcon />
                            Unarchive
                        </DropdownMenuItem>
                    ) : (
                        <DropdownMenuItem onClick={onArchive}>
                            <ArchiveIcon />
                            Archive
                        </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={onDelete} variant="destructive">
                        <TrashIcon />
                        Delete
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}

function TodoDetails({
    todo,
    userId,
    userEmail,
    onPatch,
    onDelete,
    supabase,
}: {
    todo: TodoRow | null;
    userId: string;
    userEmail: string;
    onPatch: (patch: Partial<Pick<TodoRow, "title" | "description" | "status" | "archived">>) => Promise<void>;
    onDelete: () => Promise<void>;
    supabase: ReturnType<typeof createClient>;
}) {
    const [isEditingTitle, setIsEditingTitle] = React.useState(false);
    const [titleDraft, setTitleDraft] = React.useState(todo?.title ?? "");
    const [descDraft, setDescDraft] = React.useState(todo?.description ?? "");
    const [commentDraft, setCommentDraft] = React.useState("");

    const [comments, setComments] = React.useState<CommentRow[] | null>(null);
    const [commentsError, setCommentsError] = React.useState<string | null>(null);
    const [isLoadingComments, startLoadingComments] = React.useTransition();
    const [isSaving, startSaving] = React.useTransition();
    const [isPostingComment, startPostingComment] = React.useTransition();

    React.useEffect(() => {
        if (!todo) {
            setComments(null);
            setCommentsError(null);
            return;
        }

        setIsEditingTitle(false);
        setTitleDraft(todo.title);
        setDescDraft(todo.description ?? "");

        const todoId = todo.id;
        startLoadingComments(async () => {
            setCommentsError(null);
            const { data, error } = await supabase
                .from("todo_comments")
                .select("*")
                .eq("todo_id", todoId)
                .order("created_at", { ascending: true });

            if (error) {
                setCommentsError(error.message);
                setComments([]);
                return;
            }

            setComments((data as CommentRow[]) ?? []);
        });
    }, [todo, supabase]);

    if (!todo) {
        return (
            <Card className="animate-in fade-in-0 zoom-in-95 duration-200">
                <CardHeader>
                    <CardTitle>Details</CardTitle>
                    <CardDescription>Select a todo to see details and comments.</CardDescription>
                </CardHeader>
            </Card>
        );
    }

    const todoRow = todo;

    async function saveTitle() {
        const next = titleDraft.trim();
        if (!next || next === todoRow.title) {
            setIsEditingTitle(false);
            setTitleDraft(todoRow.title);
            return;
        }
        await onPatch({ title: next });
        setIsEditingTitle(false);
    }

    async function saveDescription() {
        const next = descDraft.trim();
        const nextValue = next ? next : null;
        if ((todoRow.description ?? null) === nextValue) return;
        await onPatch({ description: nextValue });
    }

    async function postComment() {
        const body = commentDraft.trim();
        if (!body) return;

        setCommentsError(null);
        const { data, error } = await supabase
            .from("todo_comments")
            .insert({
                todo_id: todoRow.id,
                user_id: userId,
                author_email: userEmail,
                body,
            })
            .select("*")
            .single();

        if (error) {
            setCommentsError(error.message);
            return;
        }

        const row = data as CommentRow;
        setComments((prev) => (prev ? [...prev, row] : [row]));
        setCommentDraft("");
    }

    return (
        <Card className="animate-in fade-in-0 zoom-in-95 duration-200">
            <CardHeader className="border-b">
                <CardTitle className="flex items-center gap-2">
                    <span className="truncate">Details</span>
                    {todo.archived ? <Badge variant="secondary">Archived</Badge> : null}
                    {todo.status === "done" ? <Badge variant="secondary">Done</Badge> : null}
                </CardTitle>
                <CardDescription>
                    <span className="inline-flex items-center gap-1">
                        <CalendarIcon className="size-4" />
                        {formatDateTime(todo.created_at)}
                    </span>
                </CardDescription>
                <CardAction>
                    <div className="flex items-center gap-1">
                        <Button
                            onClick={() => onPatch({ status: todo.status === "done" ? "open" : "done" })}
                            size="sm"
                            variant="outline"
                        >
                            {todo.status === "done" ? (
                                <XCircleIcon data-icon="inline-start" />
                            ) : (
                                <CheckCircleIcon data-icon="inline-start" />
                            )}
                            {todo.status === "done" ? "Reopen" : "Complete"}
                        </Button>
                        <Button onClick={() => onPatch({ archived: !todo.archived })} size="sm" variant="outline">
                            <ArchiveIcon data-icon="inline-start" />
                            {todo.archived ? "Unarchive" : "Archive"}
                        </Button>
                        <AlertDialog>
                            <AlertDialogTrigger render={<Button size="sm" variant="destructive" />}>
                                <TrashIcon data-icon="inline-start" />
                                Delete
                            </AlertDialogTrigger>
                            <AlertDialogContent size="sm">
                                <AlertDialogHeader>
                                    <AlertDialogMedia>
                                        <TrashIcon />
                                    </AlertDialogMedia>
                                    <AlertDialogTitle>Delete this todo?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This permanently removes the todo and its comments.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={onDelete}>Delete</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                </CardAction>
            </CardHeader>

            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <div className="text-muted-foreground text-xs font-medium">Title</div>
                    {isEditingTitle ? (
                        <div className="flex items-center gap-2">
                            <Input onChange={(e) => setTitleDraft(e.target.value)} value={titleDraft} />
                            <Button disabled={isSaving || !titleDraft.trim()} onClick={() => startSaving(saveTitle)}>
                                Save
                            </Button>
                            <Button
                                onClick={() => {
                                    setIsEditingTitle(false);
                                    setTitleDraft(todo.title);
                                }}
                                variant="outline"
                            >
                                Cancel
                            </Button>
                        </div>
                    ) : (
                        <div className="flex items-start gap-2">
                            <div className="flex-1 text-sm font-medium leading-snug">{todo.title}</div>
                            <Button onClick={() => setIsEditingTitle(true)} size="icon" variant="outline">
                                <PencilSimpleIcon />
                                <span className="sr-only">Edit title</span>
                            </Button>
                        </div>
                    )}
                </div>

                <div className="space-y-2">
                    <div className="text-muted-foreground text-xs font-medium">Description</div>
                    <Textarea
                        onChange={(e) => setDescDraft(e.target.value)}
                        placeholder="Add notes, acceptance criteria, links, etc."
                        rows={6}
                        value={descDraft}
                    />
                    <div className="flex items-center gap-2">
                        <Button disabled={isSaving} onClick={() => startSaving(saveDescription)}>
                            Save notes
                        </Button>
                        <Button
                            disabled={isSaving}
                            onClick={() => setDescDraft(todo.description ?? "")}
                            variant="outline"
                        >
                            Reset
                        </Button>
                    </div>
                </div>

                <Separator />

                <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                        <div>
                            <div className="text-xs font-medium">Comments</div>
                            <div className="text-muted-foreground text-xs">{comments?.length ?? 0} total</div>
                        </div>
                        {isLoadingComments ? <Badge variant="secondary">Loading</Badge> : null}
                    </div>

                    {commentsError ? <div className="text-destructive text-xs">{commentsError}</div> : null}

                    <div className="space-y-2">
                        {(comments ?? []).length === 0 ? (
                            <div className="text-muted-foreground text-xs">No comments yet.</div>
                        ) : (
                            <div className="space-y-2">
                                {(comments ?? []).map((c) => (
                                    <div
                                        className="ring-foreground/10 bg-background space-y-1 rounded-none p-2 ring-1"
                                        key={c.id}
                                    >
                                        <div className="text-muted-foreground flex items-center justify-between gap-2 text-[11px]">
                                            <span className="truncate">{c.author_email ?? ""}</span>
                                            <span className="shrink-0">{formatDateTime(c.created_at)}</span>
                                        </div>
                                        <div className="whitespace-pre-wrap text-xs leading-relaxed">{c.body}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Textarea
                            onChange={(e) => setCommentDraft(e.target.value)}
                            placeholder="Write a comment…"
                            rows={3}
                            value={commentDraft}
                        />
                        <div className="flex items-center gap-2">
                            <Button
                                disabled={isPostingComment || !commentDraft.trim()}
                                onClick={() => startPostingComment(postComment)}
                            >
                                <PlusIcon data-icon="inline-start" />
                                Add comment
                            </Button>
                            <Button
                                disabled={isPostingComment && !!commentDraft}
                                onClick={() => setCommentDraft("")}
                                variant="outline"
                            >
                                Clear
                            </Button>
                        </div>
                    </div>
                </div>
            </CardContent>

            <CardFooter className="text-muted-foreground text-xs">Stored in `todos` and `todo_comments`.</CardFooter>
        </Card>
    );
}
