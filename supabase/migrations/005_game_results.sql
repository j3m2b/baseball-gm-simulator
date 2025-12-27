-- ============================================
-- Baseball GM Simulator - Game Results (Box Scores)
-- Stores detailed per-game results with line scores and player stats
-- ============================================

-- ============================================
-- GAME_RESULTS TABLE
-- Individual game box scores
-- ============================================

CREATE TABLE game_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    game_number INTEGER NOT NULL,

    -- Teams
    player_team_name VARCHAR(100) NOT NULL,
    opponent_name VARCHAR(100) NOT NULL,
    is_home BOOLEAN NOT NULL DEFAULT true,

    -- Final Score
    player_runs INTEGER NOT NULL DEFAULT 0,
    opponent_runs INTEGER NOT NULL DEFAULT 0,
    is_win BOOLEAN NOT NULL,

    -- Line Score (inning by inning runs)
    player_line_score JSONB NOT NULL DEFAULT '[]',  -- [0, 1, 0, 2, 0, 0, 3, 0, 1]
    opponent_line_score JSONB NOT NULL DEFAULT '[]',

    -- Team Totals
    player_hits INTEGER NOT NULL DEFAULT 0,
    player_errors INTEGER NOT NULL DEFAULT 0,
    opponent_hits INTEGER NOT NULL DEFAULT 0,
    opponent_errors INTEGER NOT NULL DEFAULT 0,

    -- Player Stats (detailed box score)
    batting_stats JSONB NOT NULL DEFAULT '[]',  -- Array of batter performances
    pitching_stats JSONB NOT NULL DEFAULT '[]', -- Array of pitcher performances

    -- Game Metadata
    attendance INTEGER NOT NULL DEFAULT 0,
    game_duration_minutes INTEGER,
    weather VARCHAR(50),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(game_id, year, game_number)
);

-- Indexes for efficient queries
CREATE INDEX idx_game_results_game_id ON game_results(game_id);
CREATE INDEX idx_game_results_season ON game_results(season_id);
CREATE INDEX idx_game_results_game_year ON game_results(game_id, year);
CREATE INDEX idx_game_results_game_number ON game_results(game_id, year, game_number);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE game_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage game results" ON game_results
    FOR ALL USING (
        game_id IN (SELECT id FROM games WHERE user_id = auth.uid())
    );

-- ============================================
-- ADD HELPER FUNCTION TO GET GAME LOG
-- ============================================

CREATE OR REPLACE FUNCTION get_game_log(
    p_game_id UUID,
    p_year INTEGER,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    game_number INTEGER,
    is_home BOOLEAN,
    opponent_name VARCHAR(100),
    player_runs INTEGER,
    opponent_runs INTEGER,
    is_win BOOLEAN,
    player_hits INTEGER,
    player_errors INTEGER,
    opponent_hits INTEGER,
    opponent_errors INTEGER,
    attendance INTEGER,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        gr.id,
        gr.game_number,
        gr.is_home,
        gr.opponent_name,
        gr.player_runs,
        gr.opponent_runs,
        gr.is_win,
        gr.player_hits,
        gr.player_errors,
        gr.opponent_hits,
        gr.opponent_errors,
        gr.attendance,
        gr.created_at
    FROM game_results gr
    WHERE gr.game_id = p_game_id
      AND gr.year = p_year
    ORDER BY gr.game_number DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE game_results IS 'Individual game box scores with detailed stats';
COMMENT ON COLUMN game_results.player_line_score IS 'Array of runs per inning for player team';
COMMENT ON COLUMN game_results.opponent_line_score IS 'Array of runs per inning for opponent';
COMMENT ON COLUMN game_results.batting_stats IS 'JSON array of batter performances: {playerId, name, position, ab, r, h, doubles, triples, hr, rbi, bb, so}';
COMMENT ON COLUMN game_results.pitching_stats IS 'JSON array of pitcher performances: {playerId, name, ip, h, r, er, bb, so, pitchCount, isWin, isLoss, isSave}';
