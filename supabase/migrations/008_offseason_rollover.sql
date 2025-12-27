-- ============================================
-- OFFSEASON ROLLOVER SYSTEM
-- Adds career stats tracking and team history
-- ============================================

-- Add career_stats column to players table
-- This stores an array of season stat summaries
ALTER TABLE players
ADD COLUMN IF NOT EXISTS career_stats JSONB DEFAULT '[]';

-- Add a column to track if player is a free agent (contract expired)
ALTER TABLE players
ADD COLUMN IF NOT EXISTS is_free_agent BOOLEAN DEFAULT FALSE;

-- Add original_team to track where player came from
ALTER TABLE players
ADD COLUMN IF NOT EXISTS original_team_id UUID REFERENCES games(id) ON DELETE SET NULL;

-- Team history table - tracks each season's results
CREATE TABLE IF NOT EXISTS team_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    tier VARCHAR(20) NOT NULL,
    wins INTEGER NOT NULL DEFAULT 0,
    losses INTEGER NOT NULL DEFAULT 0,
    win_pct DECIMAL(4,3) NOT NULL DEFAULT 0.000,
    league_rank INTEGER,
    made_playoffs BOOLEAN DEFAULT FALSE,
    playoff_result VARCHAR(50), -- 'Champion', 'Finals', 'Semifinals', 'Missed'
    total_revenue BIGINT DEFAULT 0,
    total_expenses BIGINT DEFAULT 0,
    net_income BIGINT DEFAULT 0,
    avg_attendance INTEGER DEFAULT 0,
    mvp_player_id UUID REFERENCES players(id) ON DELETE SET NULL,
    mvp_player_name VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(game_id, year)
);

-- Add championship_winner column to seasons if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'seasons' AND column_name = 'championship_winner'
    ) THEN
        ALTER TABLE seasons ADD COLUMN championship_winner BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Draft order table - tracks pick order for each year
CREATE TABLE IF NOT EXISTS draft_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    pick_number INTEGER NOT NULL,
    team_id VARCHAR(50) NOT NULL, -- 'player' or AI team id
    team_name VARCHAR(100) NOT NULL,
    previous_season_wins INTEGER DEFAULT 0,
    previous_season_losses INTEGER DEFAULT 0,
    is_used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(game_id, year, pick_number)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_team_history_game_id ON team_history(game_id);
CREATE INDEX IF NOT EXISTS idx_team_history_year ON team_history(year);
CREATE INDEX IF NOT EXISTS idx_draft_orders_game_id ON draft_orders(game_id);
CREATE INDEX IF NOT EXISTS idx_draft_orders_year ON draft_orders(year);
CREATE INDEX IF NOT EXISTS idx_players_is_free_agent ON players(is_free_agent);
CREATE INDEX IF NOT EXISTS idx_players_career_stats ON players USING GIN(career_stats);
