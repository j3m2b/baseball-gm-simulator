-- ============================================
-- PLAYOFFS AND CHAMPIONSHIP SYSTEM
-- Tracks playoff brackets, series, and results
-- ============================================

-- Playoff brackets table
CREATE TABLE IF NOT EXISTS playoff_brackets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, semifinals, finals, complete
    champion_team_id VARCHAR(50), -- Will be 'player' or AI team id
    champion_team_name VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(game_id, year)
);

-- Playoff series table (tracks each matchup)
CREATE TABLE IF NOT EXISTS playoff_series (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bracket_id UUID NOT NULL REFERENCES playoff_brackets(id) ON DELETE CASCADE,
    round VARCHAR(20) NOT NULL, -- 'semifinals', 'finals'
    series_number INTEGER NOT NULL, -- 1 or 2 for semifinals, 1 for finals
    team1_id VARCHAR(50) NOT NULL, -- 'player' or AI team id
    team1_name VARCHAR(100) NOT NULL,
    team1_seed INTEGER NOT NULL,
    team1_wins INTEGER NOT NULL DEFAULT 0,
    team2_id VARCHAR(50) NOT NULL,
    team2_name VARCHAR(100) NOT NULL,
    team2_seed INTEGER NOT NULL,
    team2_wins INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, in_progress, complete
    winner_id VARCHAR(50),
    winner_name VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Playoff games table (individual games in a series)
CREATE TABLE IF NOT EXISTS playoff_games (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    series_id UUID NOT NULL REFERENCES playoff_series(id) ON DELETE CASCADE,
    game_number INTEGER NOT NULL, -- 1-5 for best of 5
    home_team_id VARCHAR(50) NOT NULL,
    away_team_id VARCHAR(50) NOT NULL,
    home_score INTEGER,
    away_score INTEGER,
    winner_id VARCHAR(50),
    is_complete BOOLEAN NOT NULL DEFAULT FALSE,
    home_line_score JSONB DEFAULT '[]',
    away_line_score JSONB DEFAULT '[]',
    batting_stats JSONB DEFAULT '[]',
    pitching_stats JSONB DEFAULT '[]',
    attendance INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_playoff_brackets_game_id ON playoff_brackets(game_id);
CREATE INDEX IF NOT EXISTS idx_playoff_brackets_year ON playoff_brackets(year);
CREATE INDEX IF NOT EXISTS idx_playoff_series_bracket_id ON playoff_series(bracket_id);
CREATE INDEX IF NOT EXISTS idx_playoff_games_series_id ON playoff_games(series_id);

-- Trigger to update timestamps
CREATE OR REPLACE FUNCTION update_playoff_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_playoff_brackets_updated_at
    BEFORE UPDATE ON playoff_brackets
    FOR EACH ROW
    EXECUTE FUNCTION update_playoff_updated_at();

CREATE TRIGGER update_playoff_series_updated_at
    BEFORE UPDATE ON playoff_series
    FOR EACH ROW
    EXECUTE FUNCTION update_playoff_updated_at();
