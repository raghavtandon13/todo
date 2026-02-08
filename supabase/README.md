# Database Setup

This directory contains SQL scripts to set up the Todo App database in Supabase.

## Files

- **`setup_complete_schema.sql`** - Complete database schema including all tables, indexes, RLS policies, and triggers. Use this for a fresh database setup.
- **`teams_schema.sql`** - Original teams schema (kept for reference)

## Quick Start

### Option 1: Fresh Database (No existing data)

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Create a new query
4. Copy and paste the entire contents of `setup_complete_schema.sql`
5. Run the query

### Option 2: Reset Everything (⚠️ DESTROYS ALL DATA)

The script now includes a "NUKE EVERYTHING" section at the top that will:
- Drop all existing tables (todos, todo_comments, teams, team_members)
- Delete all data permanently
- Remove all policies, indexes, functions, and triggers
- Create fresh tables from scratch

**⚠️ WARNING: This is destructive! Only use this if you want to completely reset your database.**

If you want to keep existing data, comment out or remove Section 0 (lines 8-67) before running.

## What Gets Created

### Tables

1. **todos** - Main todo items with team support
   - id, user_id, title, description
   - status (open/done), archived, priority (1-3)
   - team_id (nullable), visibility (private/team)
   - created_at, updated_at

2. **todo_comments** - Comments on todos
   - id, todo_id, user_id, body
   - author_email, created_at

3. **teams** - Team/organization entities
   - id, name, slug, description
   - created_by, created_at, updated_at

4. **team_members** - Many-to-many relationship for team membership
   - id, team_id, user_id, role (admin/member)
   - invited_by, user_email, joined_at

### Features

- **Row Level Security (RLS)** - All tables have RLS enabled with appropriate policies
- **Auto-generated slugs** - Teams get URL-friendly slugs auto-generated from names
- **Auto-populated emails** - author_email and user_email fields auto-populate from auth.users
- **Updated timestamps** - Automatic updated_at column updates
- **Comprehensive indexes** - Optimized for common query patterns

## Verification

After running the script, you can verify the setup by running these queries:

```sql
-- Check tables exist
select 'todos' as table_name, count(*) as row_count from todos
union all
select 'todo_comments', count(*) from todo_comments
union all
select 'teams', count(*) from teams
union all
select 'team_members', count(*) from team_members;

-- Check RLS is enabled
select tablename, rowsecurity 
from pg_tables 
where schemaname = 'public' 
and tablename in ('todos', 'todo_comments', 'teams', 'team_members');
```

## Sample Data

The script includes commented-out sample data at the bottom. To add sample data:

1. Uncomment the INSERT statements at the bottom of the file
2. Replace `'your-user-id-here'` with an actual user UUID from your `auth.users` table
3. Re-run the script

## What the "NUKE EVERYTHING" Section Does

Section 0 of the script automatically handles cleanup:

1. **Drops all triggers** - Removes update triggers, slug generators, email auto-population
2. **Drops all RLS policies** - Removes row-level security policies from all tables
3. **Drops all indexes** - Removes performance indexes
4. **Drops all functions** - Removes helper functions for timestamps, slugs, and email population
5. **Disables RLS** - Temporarily disables RLS to allow table drops
6. **Drops all tables** - Removes tables in correct order respecting foreign keys:
   - `todo_comments` (depends on todos)
   - `todos` (depends on teams)
   - `team_members` (depends on teams and auth.users)
   - `teams`

This ensures a completely clean slate with no conflicts from existing schema objects.

## Security Notes

- All tables have Row Level Security (RLS) enabled
- Users can only see their own todos and team todos they're members of
- Team creators and admins have special privileges for team management
- Users can only delete their own todos and comments
