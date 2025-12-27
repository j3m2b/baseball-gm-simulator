-- ============================================
-- Game Progression Enhancement
-- Adds game status tracking and promotion history
-- ============================================

-- Add status column to games table
ALTER TABLE games ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'active';

-- Add check constraint for valid status values
ALTER TABLE games DROP CONSTRAINT IF EXISTS games_status_check;
ALTER TABLE games ADD CONSTRAINT games_status_check
    CHECK (status IN ('active', 'game_over', 'promoted', 'champion', 'abandoned'));

-- Add promotion tracking columns to current_franchise
ALTER TABLE current_franchise ADD COLUMN IF NOT EXISTS total_promotions INTEGER NOT NULL DEFAULT 0;
ALTER TABLE current_franchise ADD COLUMN IF NOT EXISTS last_promotion_year INTEGER DEFAULT NULL;

-- Create table for promotion history
CREATE TABLE IF NOT EXISTS promotion_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    from_tier VARCHAR(20) NOT NULL,
    to_tier VARCHAR(20) NOT NULL,

    -- Snapshot of stats at time of promotion
    win_pct DECIMAL(4,3) NOT NULL,
    reserves DECIMAL(15,2) NOT NULL,
    city_pride INTEGER NOT NULL,
    consecutive_winning_seasons INTEGER NOT NULL,
    won_division BOOLEAN NOT NULL DEFAULT false,
    won_championship BOOLEAN NOT NULL DEFAULT false,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_promotion_history_game_id ON promotion_history(game_id);

-- Enable RLS
ALTER TABLE promotion_history ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY "Users can view own promotion history" ON promotion_history
    FOR ALL USING (
        game_id IN (SELECT id FROM games WHERE user_id = auth.uid())
    );

-- Create table for game over snapshots (for post-mortem analysis)
CREATE TABLE IF NOT EXISTS game_endings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    ending_type VARCHAR(20) NOT NULL, -- 'bankruptcy', 'champion', 'abandoned'
    year INTEGER NOT NULL,
    tier VARCHAR(20) NOT NULL,

    -- Final stats
    final_reserves DECIMAL(15,2) NOT NULL,
    total_debt DECIMAL(15,2) NOT NULL DEFAULT 0,
    final_city_pride INTEGER NOT NULL,
    total_wins INTEGER NOT NULL DEFAULT 0,
    total_losses INTEGER NOT NULL DEFAULT 0,
    total_promotions INTEGER NOT NULL DEFAULT 0,

    -- Reason/message
    reason TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_game_endings_game_id ON game_endings(game_id);

-- Enable RLS
ALTER TABLE game_endings ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY "Users can view own game endings" ON game_endings
    FOR ALL USING (
        game_id IN (SELECT id FROM games WHERE user_id = auth.uid())
    );

-- Comments
COMMENT ON COLUMN games.status IS 'Current game status: active, game_over (bankruptcy), promoted (reached MLB), champion (won World Series), abandoned';
COMMENT ON TABLE promotion_history IS 'Records each tier promotion for historical tracking';
COMMENT ON TABLE game_endings IS 'Records final state when a game ends (bankruptcy, championship, etc.)';
