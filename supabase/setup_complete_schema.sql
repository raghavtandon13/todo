-- ============================================================================
-- Complete Todo App Database Schema
-- Run this in the Supabase SQL Editor to set up all tables, indexes, 
-- RLS policies, and triggers for a fresh database
-- ============================================================================

-- ============================================================================
-- 0. NUKE EVERYTHING (Drop all existing tables, policies, functions, triggers)
-- ============================================================================
-- WARNING: This will DELETE ALL DATA in the following tables:
-- todos, todo_comments, teams, team_members
-- Only run this if you want a completely fresh start!

-- Drop functions first (they don't depend on tables)
drop function if exists update_updated_at_column() cascade;
drop function if exists generate_team_slug(text) cascade;
drop function if exists set_team_slug() cascade;
drop function if exists set_todo_author_email() cascade;
drop function if exists set_comment_author_email() cascade;
drop function if exists set_team_member_email() cascade;
drop function if exists is_team_member(uuid, uuid) cascade;
drop function if exists is_team_admin(uuid, uuid) cascade;

-- Drop all policies using dynamic SQL (handles missing tables gracefully)
do $$
declare
    pol record;
begin
    for pol in 
        select policyname, tablename 
        from pg_policies 
        where schemaname = 'public' 
        and tablename in ('todos', 'todo_comments', 'teams', 'team_members')
    loop
        begin
            execute format('drop policy if exists %I on %I', pol.policyname, pol.tablename);
        exception when others then
            -- Ignore errors if table doesn't exist
            null;
        end;
    end loop;
end $$;

-- Drop tables in correct order (CASCADE will drop associated triggers, indexes, etc.)
-- Order matters due to foreign key constraints
drop table if exists todo_comments cascade;
drop table if exists todos cascade;
drop table if exists team_members cascade;
drop table if exists teams cascade;

-- ============================================================================
-- 1. EXTENSIONS
-- ============================================================================
create extension if not exists "uuid-ossp";

-- ============================================================================
-- 2. CREATE ALL TABLES (in dependency order: teams -> team_members -> todos -> todo_comments)
-- ============================================================================

-- Teams table (no dependencies)
create table if not exists teams (
    id uuid default gen_random_uuid() primary key,
    name text not null,
    slug text unique not null,
    description text,
    created_by uuid not null references auth.users(id) on delete cascade,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- Team members table (depends on teams)
create table if not exists team_members (
    id uuid default gen_random_uuid() primary key,
    team_id uuid not null references teams(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    role text not null check (role in ('admin', 'member')) default 'member',
    invited_by uuid references auth.users(id) on delete set null,
    user_email text, -- Store email for display purposes
    joined_at timestamptz default now(),
    unique(team_id, user_id)
);

-- Todos table (depends on teams)
create table if not exists todos (
    id uuid default gen_random_uuid() primary key,
    user_id uuid not null references auth.users(id) on delete cascade,
    title text not null,
    description text,
    status text not null check (status in ('open', 'done')) default 'open',
    archived boolean not null default false,
    priority integer check (priority in (1, 2, 3)) default 2,
    due_on timestamptz,
    author_email text,
    team_id uuid references teams(id) on delete set null,
    visibility text not null check (visibility in ('private', 'team')) default 'private',
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- Todo comments table (depends on todos)
create table if not exists todo_comments (
    id uuid default gen_random_uuid() primary key,
    todo_id uuid not null references todos(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    body text not null,
    author_email text,
    created_at timestamptz default now()
);

-- ============================================================================
-- 3. CREATE HELPER FUNCTIONS (Security Definer to avoid RLS recursion)
-- Must be created BEFORE policies that use them
-- ============================================================================

-- Function to check if user is team member (security definer bypasses RLS)
-- This avoids infinite recursion when policies reference each other
create or replace function is_team_member(team_uuid uuid, user_uuid uuid)
returns boolean
security definer
set search_path = public
as $$
begin
    return exists (
        select 1 from team_members
        where team_id = team_uuid and user_id = user_uuid
    );
end;
$$ language plpgsql;

-- Function to check if user is team admin (security definer bypasses RLS)
create or replace function is_team_admin(team_uuid uuid, user_uuid uuid)
returns boolean
security definer
set search_path = public
as $$
begin
    return exists (
        select 1 from team_members
        where team_id = team_uuid 
        and user_id = user_uuid 
        and role = 'admin'
    );
end;
$$ language plpgsql;

-- ============================================================================
-- 4. ENABLE RLS ON ALL TABLES
-- ============================================================================
alter table teams enable row level security;
alter table team_members enable row level security;
alter table todos enable row level security;
alter table todo_comments enable row level security;

-- ============================================================================
-- 5. CREATE ALL INDEXES
-- ============================================================================

-- Teams indexes
create index if not exists idx_teams_created_by on teams(created_by);
create index if not exists idx_teams_slug on teams(slug);

-- Team members indexes
create index if not exists idx_team_members_team_id on team_members(team_id);
create index if not exists idx_team_members_user_id on team_members(user_id);

-- Todos indexes
create index if not exists idx_todos_user_id on todos(user_id);
create index if not exists idx_todos_status on todos(status);
create index if not exists idx_todos_archived on todos(archived);
create index if not exists idx_todos_created_at on todos(created_at desc);
create index if not exists idx_todos_team_id on todos(team_id);
create index if not exists idx_todos_visibility on todos(visibility);
create index if not exists idx_todos_user_id_team_id on todos(user_id, team_id);

-- Todo comments indexes
create index if not exists idx_todo_comments_todo_id on todo_comments(todo_id);
create index if not exists idx_todo_comments_user_id on todo_comments(user_id);
create index if not exists idx_todo_comments_created_at on todo_comments(created_at);

-- ============================================================================
-- 6. CREATE ALL RLS POLICIES (after all tables and helper functions exist)
-- ============================================================================

-- Teams Policies

-- Users can view teams they are members of or created
-- Uses security definer function to avoid infinite recursion
create policy "Users can view their teams" on teams
    for select using (
        created_by = auth.uid() or
        is_team_member(teams.id, auth.uid())
    );

-- Only team creators/admins can update team info
-- Uses security definer function to avoid infinite recursion
create policy "Team admins can update teams" on teams
    for update using (
        created_by = auth.uid() or
        is_team_admin(teams.id, auth.uid())
    );

-- Only team creators can delete teams
create policy "Team creators can delete teams" on teams
    for delete using (created_by = auth.uid());

-- Authenticated users can create teams
create policy "Authenticated users can create teams" on teams
    for insert with check (auth.uid() = created_by);

-- Team Members Policies
-- IMPORTANT: These policies avoid self-referencing team_members to prevent infinite recursion

-- Users can view their own team memberships only
-- We intentionally do NOT allow viewing other team members here to avoid recursion
-- Team member visibility is handled via security definer functions in other policies
create policy "Users can view own team memberships" on team_members
    for select using (
        user_id = auth.uid()
    );

-- Team creators can insert new members
-- We check teams.created_by to verify the user is the team creator
-- This creates a one-way dependency (team_members -> teams) which is safe
create policy "Team creators can add members" on team_members
    for insert with check (
        exists (
            select 1 from teams t
            where t.id = team_members.team_id
            and t.created_by = auth.uid()
        )
    );

-- Team creators can update member roles
create policy "Team creators can update members" on team_members
    for update using (
        exists (
            select 1 from teams t
            where t.id = team_members.team_id
            and t.created_by = auth.uid()
        )
    );

-- Users can remove themselves, and team creators can remove anyone
create policy "Users can remove themselves or team creators can remove members" on team_members
    for delete using (
        user_id = auth.uid()
        or
        exists (
            select 1 from teams t
            where t.id = team_members.team_id
            and t.created_by = auth.uid()
        )
    );

-- Todos Policies

-- Users can view their own todos or team todos for teams they're members of
-- Uses security definer function to avoid infinite recursion
create policy "Users can view todos" on todos
    for select using (
        user_id = auth.uid() or
        (
            visibility = 'team' and team_id is not null and
            is_team_member(todos.team_id, auth.uid())
        ) or
        (
            visibility = 'team' and team_id is not null and
            exists (
                select 1 from teams t
                where t.id = todos.team_id and t.created_by = auth.uid()
            )
        )
    );

-- Users can create todos (personal or for teams they belong to)
-- Uses security definer function to avoid infinite recursion
create policy "Users can create todos" on todos
    for insert with check (
        auth.uid() = user_id and
        (
            team_id is null or
            visibility = 'private' or
            is_team_member(todos.team_id, auth.uid()) or
            exists (
                select 1 from teams t
                where t.id = todos.team_id and t.created_by = auth.uid()
            )
        )
    );

-- Users can update their own todos or team todos if they're team members
-- Uses security definer function to avoid infinite recursion
create policy "Users can update todos" on todos
    for update using (
        user_id = auth.uid() or
        (
            visibility = 'team' and team_id is not null and
            is_team_member(todos.team_id, auth.uid())
        ) or
        (
            visibility = 'team' and team_id is not null and
            exists (
                select 1 from teams t
                where t.id = todos.team_id and t.created_by = auth.uid()
            )
        )
    );

-- Users can delete their own todos
create policy "Users can delete todos" on todos
    for delete using (user_id = auth.uid());

-- Todo Comments Policies

-- Users can view comments on todos they can see
-- Uses security definer function to avoid infinite recursion
create policy "Users can view comments" on todo_comments
    for select using (
        exists (
            select 1 from todos t
            where t.id = todo_comments.todo_id and (
                t.user_id = auth.uid() or
                (
                    t.visibility = 'team' and t.team_id is not null and
                    is_team_member(t.team_id, auth.uid())
                ) or
                (
                    t.visibility = 'team' and t.team_id is not null and
                    exists (
                        select 1 from teams teams_tbl
                        where teams_tbl.id = t.team_id and teams_tbl.created_by = auth.uid()
                    )
                )
            )
        )
    );

-- Users can create comments on todos they can see
-- Uses security definer function to avoid infinite recursion
create policy "Users can create comments" on todo_comments
    for insert with check (
        auth.uid() = user_id and
        exists (
            select 1 from todos t
            where t.id = todo_comments.todo_id and (
                t.user_id = auth.uid() or
                (
                    t.visibility = 'team' and t.team_id is not null and
                    is_team_member(t.team_id, auth.uid())
                ) or
                (
                    t.visibility = 'team' and t.team_id is not null and
                    exists (
                        select 1 from teams teams_tbl
                        where teams_tbl.id = t.team_id and teams_tbl.created_by = auth.uid()
                    )
                )
            )
        )
    );

-- Users can delete their own comments
create policy "Users can delete own comments" on todo_comments
    for delete using (user_id = auth.uid());

-- ============================================================================
-- 7. TRIGGER FUNCTIONS
-- ============================================================================

-- Function to update updated_at timestamp
create or replace function update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

-- Trigger for todos updated_at
drop trigger if exists update_todos_updated_at on todos;
create trigger update_todos_updated_at
    before update on todos
    for each row
    execute function update_updated_at_column();

-- Trigger for teams updated_at
drop trigger if exists update_teams_updated_at on teams;
create trigger update_teams_updated_at
    before update on teams
    for each row
    execute function update_updated_at_column();

-- Function to generate slug from team name
create or replace function generate_team_slug(name text)
returns text as $$
declare
    base_slug text;
    final_slug text;
    counter integer := 0;
begin
    base_slug := lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g'));
    base_slug := trim(both '-' from base_slug);
    final_slug := base_slug;
    
    while exists (select 1 from teams where slug = final_slug) loop
        counter := counter + 1;
        final_slug := base_slug || '-' || counter;
    end loop;
    
    return final_slug;
end;
$$ language plpgsql;

-- Trigger to auto-generate slug on insert
create or replace function set_team_slug()
returns trigger as $$
begin
    if new.slug is null or new.slug = '' then
        new.slug := generate_team_slug(new.name);
    end if;
    return new;
end;
$$ language plpgsql;

drop trigger if exists trigger_set_team_slug on teams;
create trigger trigger_set_team_slug
    before insert on teams
    for each row
    execute function set_team_slug();

-- Function to auto-populate author_email on todo insert
create or replace function set_todo_author_email()
returns trigger as $$
begin
    if new.author_email is null then
        select email into new.author_email
        from auth.users
        where id = new.user_id;
    end if;
    return new;
end;
$$ language plpgsql;

drop trigger if exists trigger_set_todo_author_email on todos;
create trigger trigger_set_todo_author_email
    before insert on todos
    for each row
    execute function set_todo_author_email();

-- Function to auto-populate author_email on comment insert
create or replace function set_comment_author_email()
returns trigger as $$
begin
    if new.author_email is null then
        select email into new.author_email
        from auth.users
        where id = new.user_id;
    end if;
    return new;
end;
$$ language plpgsql;

drop trigger if exists trigger_set_comment_author_email on todo_comments;
create trigger trigger_set_comment_author_email
    before insert on todo_comments
    for each row
    execute function set_comment_author_email();

-- Function to auto-populate user_email on team_member insert
create or replace function set_team_member_email()
returns trigger as $$
begin
    if new.user_email is null then
        select email into new.user_email
        from auth.users
        where id = new.user_id;
    end if;
    return new;
end;
$$ language plpgsql;

drop trigger if exists trigger_set_team_member_email on team_members;
create trigger trigger_set_team_member_email
    before insert on team_members
    for each row
    execute function set_team_member_email();

-- ============================================================================
-- 8. SAMPLE DATA (Optional - Uncomment to add sample data)
-- ============================================================================

-- Note: Sample data requires an authenticated user.
-- Uncomment and modify the user_id below with a real user ID from your auth.users table

/*
-- Insert sample teams (replace 'your-user-id-here' with actual user UUID)
insert into teams (name, description, created_by)
values 
    ('Engineering Team', 'The engineering department', 'your-user-id-here'),
    ('Design Team', 'UI/UX design team', 'your-user-id-here');

-- Insert sample todos (replace 'your-user-id-here' with actual user UUID)
insert into todos (user_id, title, description, status, priority, visibility)
values 
    ('your-user-id-here', 'Complete project setup', 'Initialize the project repository and setup CI/CD', 'open', 1, 'private'),
    ('your-user-id-here', 'Review pull requests', 'Review pending PRs from team members', 'open', 2, 'team'),
    ('your-user-id-here', 'Update documentation', 'Update the API documentation with new endpoints', 'done', 2, 'private');
*/

-- ============================================================================
-- VERIFICATION QUERIES (Run these to verify setup)
-- ============================================================================

-- Check all tables exist
-- select 'todos' as table_name, count(*) as row_count from todos
-- union all
-- select 'todo_comments', count(*) from todo_comments
-- union all
-- select 'teams', count(*) from teams
-- union all
-- select 'team_members', count(*) from team_members;

-- Check RLS is enabled
-- select tablename, rowsecurity from pg_tables where schemaname = 'public' and tablename in ('todos', 'todo_comments', 'teams', 'team_members');

-- Check indexes exist
-- select tablename, indexname from pg_indexes where schemaname = 'public' and tablename in ('todos', 'todo_comments', 'teams', 'team_members') order by tablename, indexname;
