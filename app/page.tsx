import { redirect } from "next/navigation";

import { TodoApp } from "@/components/todos/todo-app";
import type { TodoRow } from "@/components/todos/types";
import { createClient } from "@/lib/supabase/server";

export default async function Page() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const { data, error } = await supabase.from("todos").select("*").order("created_at", { ascending: false });

    return (
        <TodoApp
            initialLoadError={error?.message ?? null}
            initialTodos={(data as TodoRow[]) ?? []}
            userEmail={user.email ?? ""}
            userId={user.id}
        />
    );
}
