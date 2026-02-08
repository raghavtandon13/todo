-- Enable RLS (Row Level Security) by default
ALTER DATABASE todo SET "app.enable_rls" = 'on';

-- Create teams table
CREATE TABLE IF NOT EXISTS teams (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on teams
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

-- Team members table (junction table)
CREATE TABLE IF NOT EXISTS team_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'member')) DEFAULT 'member',
    invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    joined_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(team_id, user_id)
);

-- Enable RLS on team_members
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- Update todos table to support teams
ALTER TABLE todos ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE SET NULL;
ALTER TABLE todos ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL CHECK (visibility IN ('private', 'team')) DEFAULT 'private';

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_teams_created_by ON teams(created_by);
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_todos_team_id ON todos(team_id);
CREATE INDEX IF NOT EXISTS idx_todos_visibility ON todos(visibility);
CREATE INDEX IF NOT EXISTS idx_todos_user_id_team_id ON todos(user_id, team_id);

-- Row Level Security Policies

-- Teams policies
-- Users can view teams they are members of or created
CREATE POLICY "Users can view their teams" ON teams
    FOR SELECT USING (
        created_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM team_members
            WHERE team_id = teams.id AND user_id = auth.uid()
        )
    );

-- Only team creators/admins can update team info
CREATE POLICY "Team admins can update teams" ON teams
    FOR UPDATE USING (
        created_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM team_members
            WHERE team_id = teams.id AND user_id = auth.uid() AND role = 'admin'
        )
    );

-- Only team creators can delete teams
CREATE POLICY "Team creators can delete teams" ON teams
    FOR DELETE USING (created_by = auth.uid());

-- Authenticated users can create teams
CREATE POLICY "Authenticated users can create teams" ON teams
    FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Team members policies
-- Users can view members of teams they're part of
CREATE POLICY "Users can view team members" ON team_members
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM team_members tm
            WHERE tm.team_id = team_members.team_id AND tm.user_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM teams t
            WHERE t.id = team_members.team_id AND t.created_by = auth.uid()
        )
    );

-- Team admins can add/remove members
CREATE POLICY "Team admins can manage members" ON team_members
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM team_members tm
            WHERE tm.team_id = team_members.team_id AND tm.user_id = auth.uid() AND tm.role = 'admin'
        ) OR
        EXISTS (
            SELECT 1 FROM teams t
            WHERE t.id = team_members.team_id AND t.created_by = auth.uid()
        )
    );

-- Users can remove themselves from teams
CREATE POLICY "Users can leave teams" ON team_members
    FOR DELETE USING (user_id = auth.uid());

-- Update todos policies to support teams
-- Users can view their own todos or team todos for teams they're members of
DROP POLICY IF EXISTS "Users can view own todos" ON todos;
CREATE POLICY "Users can view todos" ON todos
    FOR SELECT USING (
        user_id = auth.uid() OR
        (
            visibility = 'team' AND team_id IS NOT NULL AND
            EXISTS (
                SELECT 1 FROM team_members tm
                WHERE tm.team_id = todos.team_id AND tm.user_id = auth.uid()
            )
        ) OR
        (
            visibility = 'team' AND team_id IS NOT NULL AND
            EXISTS (
                SELECT 1 FROM teams t
                WHERE t.id = todos.team_id AND t.created_by = auth.uid()
            )
        )
    );

-- Users can create todos (personal or for teams they belong to)
DROP POLICY IF EXISTS "Users can create todos" ON todos;
CREATE POLICY "Users can create todos" ON todos
    FOR INSERT WITH CHECK (
        auth.uid() = user_id AND
        (
            team_id IS NULL OR
            visibility = 'private' OR
            EXISTS (
                SELECT 1 FROM team_members tm
                WHERE tm.team_id = todos.team_id AND tm.user_id = auth.uid()
            ) OR
            EXISTS (
                SELECT 1 FROM teams t
                WHERE t.id = todos.team_id AND t.created_by = auth.uid()
            )
        )
    );

-- Users can update their own todos or team todos if they're team members
DROP POLICY IF EXISTS "Users can update own todos" ON todos;
CREATE POLICY "Users can update todos" ON todos
    FOR UPDATE USING (
        user_id = auth.uid() OR
        (
            visibility = 'team' AND team_id IS NOT NULL AND
            EXISTS (
                SELECT 1 FROM team_members tm
                WHERE tm.team_id = todos.team_id AND tm.user_id = auth.uid()
            )
        ) OR
        (
            visibility = 'team' AND team_id IS NOT NULL AND
            EXISTS (
                SELECT 1 FROM teams t
                WHERE t.id = todos.team_id AND t.created_by = auth.uid()
            )
        )
    );

-- Users can delete their own todos
DROP POLICY IF EXISTS "Users can delete own todos" ON todos;
CREATE POLICY "Users can delete todos" ON todos
    FOR DELETE USING (user_id = auth.uid());

-- Update todo_comments policies
-- Users can view comments on todos they can see
DROP POLICY IF EXISTS "Users can view comments on own todos" ON todo_comments;
CREATE POLICY "Users can view comments" ON todo_comments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM todos t
            WHERE t.id = todo_comments.todo_id AND (
                t.user_id = auth.uid() OR
                (
                    t.visibility = 'team' AND t.team_id IS NOT NULL AND
                    EXISTS (
                        SELECT 1 FROM team_members tm
                        WHERE tm.team_id = t.team_id AND tm.user_id = auth.uid()
                    )
                ) OR
                (
                    t.visibility = 'team' AND t.team_id IS NOT NULL AND
                    EXISTS (
                        SELECT 1 FROM teams teams_tbl
                        WHERE teams_tbl.id = t.team_id AND teams_tbl.created_by = auth.uid()
                    )
                )
            )
        )
    );

-- Users can create comments on todos they can see
DROP POLICY IF EXISTS "Users can create comments on own todos" ON todo_comments;
CREATE POLICY "Users can create comments" ON todo_comments
    FOR INSERT WITH CHECK (
        auth.uid() = user_id AND
        EXISTS (
            SELECT 1 FROM todos t
            WHERE t.id = todo_comments.todo_id AND (
                t.user_id = auth.uid() OR
                (
                    t.visibility = 'team' AND t.team_id IS NOT NULL AND
                    EXISTS (
                        SELECT 1 FROM team_members tm
                        WHERE tm.team_id = t.team_id AND tm.user_id = auth.uid()
                    )
                ) OR
                (
                    t.visibility = 'team' AND t.team_id IS NOT NULL AND
                    EXISTS (
                        SELECT 1 FROM teams teams_tbl
                        WHERE teams_tbl.id = t.team_id AND teams_tbl.created_by = auth.uid()
                    )
                )
            )
        )
    );

-- Function to generate slug from team name
CREATE OR REPLACE FUNCTION generate_team_slug(name TEXT)
RETURNS TEXT AS $$
DECLARE
    base_slug TEXT;
    final_slug TEXT;
    counter INTEGER := 0;
BEGIN
    base_slug := lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g'));
    base_slug := trim(both '-' from base_slug);
    final_slug := base_slug;
    
    WHILE EXISTS (SELECT 1 FROM teams WHERE slug = final_slug) LOOP
        counter := counter + 1;
        final_slug := base_slug || '-' || counter;
    END LOOP;
    
    RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate slug on insert
CREATE OR REPLACE FUNCTION set_team_slug()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.slug IS NULL OR NEW.slug = '' THEN
        NEW.slug := generate_team_slug(NEW.name);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_team_slug ON teams;
CREATE TRIGGER trigger_set_team_slug
    BEFORE INSERT ON teams
    FOR EACH ROW
    EXECUTE FUNCTION set_team_slug();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for teams updated_at
DROP TRIGGER IF EXISTS update_teams_updated_at ON teams;
CREATE TRIGGER update_teams_updated_at
    BEFORE UPDATE ON teams
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
