-- ============================================
-- Baseball GM Simulator - Initial Database Schema
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ENUMS
-- ============================================

CREATE TYPE difficulty_mode AS ENUM ('easy', 'normal', 'hard');
CREATE TYPE game_phase AS ENUM ('pre_season', 'draft', 'season', 'post_season', 'off_season');
CREATE TYPE tier_type AS ENUM ('LOW_A', 'HIGH_A', 'DOUBLE_A', 'TRIPLE_A', 'MLB');
CREATE TYPE player_type AS ENUM ('HITTER', 'PITCHER');
CREATE TYPE scouting_tier AS ENUM ('low', 'medium', 'high');

-- ============================================
-- GAMES TABLE
-- Main save file table - one per career
-- ============================================

CREATE TABLE games (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    city_name VARCHAR(100) NOT NULL,
    team_name VARCHAR(100) NOT NULL,
    difficulty difficulty_mode NOT NULL DEFAULT 'normal',
    current_year INTEGER NOT NULL DEFAULT 1,
    current_phase game_phase NOT NULL DEFAULT 'pre_season',
    current_tier tier_type NOT NULL DEFAULT 'LOW_A',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for user lookups
CREATE INDEX idx_games_user_id ON games(user_id);

-- ============================================
-- PLAYERS TABLE
-- All player records (~1,000 per game)
-- ============================================

CREATE TABLE players (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,

    -- Basic Info
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    age INTEGER NOT NULL CHECK (age >= 18 AND age <= 45),
    position VARCHAR(10) NOT NULL,
    player_type player_type NOT NULL,

    -- Ratings (20-80 scale)
    current_rating INTEGER NOT NULL CHECK (current_rating >= 20 AND current_rating <= 80),
    potential INTEGER NOT NULL CHECK (potential >= 20 AND potential <= 80),

    -- Attributes (JSONB for flexibility)
    hitter_attributes JSONB,
    pitcher_attributes JSONB,

    -- Hidden traits (discovered through scouting)
    hidden_traits JSONB NOT NULL DEFAULT '{"workEthic": "average", "injuryProne": false, "personality": "team_player", "coachability": 50, "clutch": 50}',
    traits_revealed BOOLEAN NOT NULL DEFAULT false,

    -- Development
    tier tier_type NOT NULL,
    years_at_tier INTEGER NOT NULL DEFAULT 0,
    confidence INTEGER NOT NULL DEFAULT 50 CHECK (confidence >= 0 AND confidence <= 100),
    morale INTEGER NOT NULL DEFAULT 50 CHECK (morale >= 0 AND morale <= 100),
    games_played INTEGER NOT NULL DEFAULT 0,
    years_in_org INTEGER NOT NULL DEFAULT 0,

    -- Contract
    salary INTEGER NOT NULL DEFAULT 0,
    contract_years INTEGER NOT NULL DEFAULT 1,

    -- Status
    is_injured BOOLEAN NOT NULL DEFAULT false,
    injury_games_remaining INTEGER NOT NULL DEFAULT 0,
    is_on_roster BOOLEAN NOT NULL DEFAULT true,

    -- Draft Info
    draft_year INTEGER NOT NULL,
    draft_round INTEGER NOT NULL,
    draft_pick INTEGER NOT NULL,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_players_game_id ON players(game_id);
CREATE INDEX idx_players_tier ON players(game_id, tier);
CREATE INDEX idx_players_roster ON players(game_id, is_on_roster);

-- ============================================
-- CURRENT_FRANCHISE TABLE
-- Player's franchise state
-- ============================================

CREATE TABLE current_franchise (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id UUID NOT NULL UNIQUE REFERENCES games(id) ON DELETE CASCADE,

    -- Current State
    tier tier_type NOT NULL DEFAULT 'LOW_A',
    budget INTEGER NOT NULL DEFAULT 500000,
    reserves INTEGER NOT NULL DEFAULT 0,

    -- Stadium
    stadium_name VARCHAR(100) NOT NULL,
    stadium_capacity INTEGER NOT NULL DEFAULT 2500,
    stadium_quality INTEGER NOT NULL DEFAULT 50 CHECK (stadium_quality >= 0 AND stadium_quality <= 100),

    -- Coaching Staff
    hitting_coach_skill INTEGER NOT NULL DEFAULT 40 CHECK (hitting_coach_skill >= 20 AND hitting_coach_skill <= 80),
    hitting_coach_salary INTEGER NOT NULL DEFAULT 50000,
    pitching_coach_skill INTEGER NOT NULL DEFAULT 40 CHECK (pitching_coach_skill >= 20 AND pitching_coach_skill <= 80),
    pitching_coach_salary INTEGER NOT NULL DEFAULT 50000,
    development_coord_skill INTEGER NOT NULL DEFAULT 40 CHECK (development_coord_skill >= 20 AND development_coord_skill <= 80),
    development_coord_salary INTEGER NOT NULL DEFAULT 50000,

    -- Ticket Pricing
    ticket_price DECIMAL(10,2) NOT NULL DEFAULT 8.00,

    -- Progression Tracking
    consecutive_winning_seasons INTEGER NOT NULL DEFAULT 0,
    consecutive_division_titles INTEGER NOT NULL DEFAULT 0,

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_current_franchise_game_id ON current_franchise(game_id);

-- ============================================
-- CITY_STATES TABLE
-- City evolution tracking
-- ============================================

CREATE TABLE city_states (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id UUID NOT NULL UNIQUE REFERENCES games(id) ON DELETE CASCADE,

    -- Demographics
    population INTEGER NOT NULL DEFAULT 15000,
    median_income INTEGER NOT NULL DEFAULT 32000,
    unemployment_rate DECIMAL(5,2) NOT NULL DEFAULT 18.00,

    -- Pride & Recognition
    team_pride INTEGER NOT NULL DEFAULT 30 CHECK (team_pride >= 0 AND team_pride <= 100),
    national_recognition INTEGER NOT NULL DEFAULT 5 CHECK (national_recognition >= 0 AND national_recognition <= 100),

    -- Buildings (50 total, stored as JSONB array)
    buildings JSONB NOT NULL DEFAULT '[]',
    occupancy_rate DECIMAL(5,2) NOT NULL DEFAULT 0.00,

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_city_states_game_id ON city_states(game_id);

-- ============================================
-- DRAFTS TABLE
-- Annual draft state
-- ============================================

CREATE TABLE drafts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,

    -- State
    current_round INTEGER NOT NULL DEFAULT 1,
    current_pick INTEGER NOT NULL DEFAULT 1,
    is_complete BOOLEAN NOT NULL DEFAULT false,

    -- Configuration
    total_rounds INTEGER NOT NULL DEFAULT 40,
    teams_count INTEGER NOT NULL DEFAULT 20,
    players_per_round INTEGER NOT NULL DEFAULT 20,

    -- Player's draft order position (1-20)
    player_draft_position INTEGER NOT NULL DEFAULT 10,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(game_id, year)
);

CREATE INDEX idx_drafts_game_id ON drafts(game_id);

-- ============================================
-- DRAFT_PROSPECTS TABLE
-- Available players for draft
-- ============================================

CREATE TABLE draft_prospects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    draft_year INTEGER NOT NULL,

    -- Basic Info
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    age INTEGER NOT NULL CHECK (age >= 18 AND age <= 22),
    position VARCHAR(10) NOT NULL,
    player_type player_type NOT NULL,

    -- True Ratings (hidden from player until scouted)
    current_rating INTEGER NOT NULL CHECK (current_rating >= 20 AND current_rating <= 80),
    potential INTEGER NOT NULL CHECK (potential >= 20 AND potential <= 80),

    -- Attributes
    hitter_attributes JSONB,
    pitcher_attributes JSONB,
    hidden_traits JSONB NOT NULL,

    -- Scouted Values (visible to player)
    scouted_rating INTEGER,
    scouted_potential INTEGER,
    scouting_accuracy scouting_tier,

    -- Draft Status
    is_drafted BOOLEAN NOT NULL DEFAULT false,
    drafted_by_team VARCHAR(50),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_draft_prospects_game_year ON draft_prospects(game_id, draft_year);
CREATE INDEX idx_draft_prospects_available ON draft_prospects(game_id, draft_year, is_drafted);

-- ============================================
-- DRAFT_PICKS TABLE
-- Historical record of draft picks
-- ============================================

CREATE TABLE draft_picks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    draft_id UUID NOT NULL REFERENCES drafts(id) ON DELETE CASCADE,
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,

    round INTEGER NOT NULL,
    pick_number INTEGER NOT NULL,     -- Overall pick number
    pick_in_round INTEGER NOT NULL,   -- Pick within round (1-20)

    team_id VARCHAR(50) NOT NULL,     -- 'player' or AI team ID
    player_id UUID NOT NULL,          -- References draft_prospects.id or players.id

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(draft_id, pick_number)
);

CREATE INDEX idx_draft_picks_draft_id ON draft_picks(draft_id);
CREATE INDEX idx_draft_picks_game_id ON draft_picks(game_id);

-- ============================================
-- SCOUTING_REPORTS TABLE
-- Player scouting data
-- ============================================

CREATE TABLE scouting_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    prospect_id UUID NOT NULL REFERENCES draft_prospects(id) ON DELETE CASCADE,

    -- Scouted Values
    scouted_rating INTEGER NOT NULL,
    scouted_potential INTEGER NOT NULL,
    accuracy scouting_tier NOT NULL,
    rating_error INTEGER NOT NULL,    -- Actual error amount

    -- Trait Discovery
    traits_revealed BOOLEAN NOT NULL DEFAULT false,
    revealed_traits JSONB,

    -- Cost Tracking
    cost INTEGER NOT NULL,
    year INTEGER NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_scouting_reports_game_id ON scouting_reports(game_id);
CREATE INDEX idx_scouting_reports_prospect ON scouting_reports(prospect_id);

-- ============================================
-- SEASONS TABLE
-- Win/loss records by year
-- ============================================

CREATE TABLE seasons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    tier tier_type NOT NULL,

    -- Record
    wins INTEGER NOT NULL DEFAULT 0,
    losses INTEGER NOT NULL DEFAULT 0,
    win_pct DECIMAL(4,3) NOT NULL DEFAULT 0.000,

    -- Standings
    division_rank INTEGER NOT NULL DEFAULT 1,
    made_playoffs BOOLEAN NOT NULL DEFAULT false,
    won_division BOOLEAN NOT NULL DEFAULT false,
    won_championship BOOLEAN NOT NULL DEFAULT false,
    won_world_series BOOLEAN NOT NULL DEFAULT false,

    -- Attendance
    total_attendance INTEGER NOT NULL DEFAULT 0,
    avg_attendance INTEGER NOT NULL DEFAULT 0,
    games_played INTEGER NOT NULL DEFAULT 140,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(game_id, year)
);

CREATE INDEX idx_seasons_game_id ON seasons(game_id);

-- ============================================
-- FINANCES TABLE
-- Yearly financial summaries
-- ============================================

CREATE TABLE finances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,

    -- Revenue
    ticket_revenue INTEGER NOT NULL DEFAULT 0,
    concession_revenue INTEGER NOT NULL DEFAULT 0,
    parking_revenue INTEGER NOT NULL DEFAULT 0,
    merchandise_revenue INTEGER NOT NULL DEFAULT 0,
    sponsorship_revenue INTEGER NOT NULL DEFAULT 0,
    total_revenue INTEGER NOT NULL DEFAULT 0,

    -- Expenses
    player_salaries INTEGER NOT NULL DEFAULT 0,
    coaching_salaries INTEGER NOT NULL DEFAULT 0,
    stadium_maintenance INTEGER NOT NULL DEFAULT 0,
    travel_costs INTEGER NOT NULL DEFAULT 0,
    marketing_costs INTEGER NOT NULL DEFAULT 0,
    debt_service INTEGER NOT NULL DEFAULT 0,
    total_expenses INTEGER NOT NULL DEFAULT 0,

    -- Net
    net_income INTEGER NOT NULL DEFAULT 0,
    ending_reserves INTEGER NOT NULL DEFAULT 0,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(game_id, year)
);

CREATE INDEX idx_finances_game_id ON finances(game_id);

-- ============================================
-- GAME_EVENTS TABLE
-- Narrative moments and events
-- ============================================

CREATE TABLE game_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,

    -- Effects (optional)
    effects JSONB,

    -- Related entities
    player_id UUID REFERENCES players(id) ON DELETE SET NULL,
    building_id INTEGER,

    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_game_events_game_id ON game_events(game_id);
CREATE INDEX idx_game_events_year ON game_events(game_id, year);
CREATE INDEX idx_game_events_unread ON game_events(game_id, is_read) WHERE is_read = false;

-- ============================================
-- AI_TEAMS TABLE
-- Static table for AI competitors
-- ============================================

CREATE TABLE ai_teams (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    city VARCHAR(50) NOT NULL,
    abbreviation VARCHAR(10) NOT NULL,
    philosophy VARCHAR(20) NOT NULL,
    risk_tolerance INTEGER NOT NULL CHECK (risk_tolerance >= 0 AND risk_tolerance <= 100),
    needs JSONB NOT NULL DEFAULT '[]',
    base_strength INTEGER NOT NULL DEFAULT 50,
    variance_multiplier DECIMAL(3,2) NOT NULL DEFAULT 1.00
);

-- ============================================
-- FRANCHISE_TIERS TABLE
-- Static table for tier configurations
-- ============================================

CREATE TABLE franchise_tiers (
    tier tier_type PRIMARY KEY,
    name VARCHAR(20) NOT NULL,
    budget INTEGER NOT NULL,
    stadium_capacity INTEGER NOT NULL,
    player_age_min INTEGER NOT NULL,
    player_age_max INTEGER NOT NULL,
    rating_min INTEGER NOT NULL,
    rating_max INTEGER NOT NULL,
    scouting_budget INTEGER NOT NULL,
    ticket_price_min DECIMAL(10,2) NOT NULL,
    ticket_price_max DECIMAL(10,2) NOT NULL,
    city_population INTEGER NOT NULL,
    unemployment_rate DECIMAL(5,2) NOT NULL,
    median_income INTEGER NOT NULL,
    promotion_requirements JSONB
);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE current_franchise ENABLE ROW LEVEL SECURITY;
ALTER TABLE city_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE draft_prospects ENABLE ROW LEVEL SECURITY;
ALTER TABLE draft_picks ENABLE ROW LEVEL SECURITY;
ALTER TABLE scouting_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE finances ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_events ENABLE ROW LEVEL SECURITY;

-- Games: Users can only access their own games
CREATE POLICY "Users can view own games" ON games
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own games" ON games
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own games" ON games
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own games" ON games
    FOR DELETE USING (auth.uid() = user_id);

-- Players: Access through game ownership
CREATE POLICY "Users can view players in own games" ON players
    FOR SELECT USING (
        game_id IN (SELECT id FROM games WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can insert players in own games" ON players
    FOR INSERT WITH CHECK (
        game_id IN (SELECT id FROM games WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can update players in own games" ON players
    FOR UPDATE USING (
        game_id IN (SELECT id FROM games WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can delete players in own games" ON players
    FOR DELETE USING (
        game_id IN (SELECT id FROM games WHERE user_id = auth.uid())
    );

-- Current Franchise: Access through game ownership
CREATE POLICY "Users can manage own franchise" ON current_franchise
    FOR ALL USING (
        game_id IN (SELECT id FROM games WHERE user_id = auth.uid())
    );

-- City States: Access through game ownership
CREATE POLICY "Users can manage own city" ON city_states
    FOR ALL USING (
        game_id IN (SELECT id FROM games WHERE user_id = auth.uid())
    );

-- Drafts: Access through game ownership
CREATE POLICY "Users can manage own drafts" ON drafts
    FOR ALL USING (
        game_id IN (SELECT id FROM games WHERE user_id = auth.uid())
    );

-- Draft Prospects: Access through game ownership
CREATE POLICY "Users can manage draft prospects" ON draft_prospects
    FOR ALL USING (
        game_id IN (SELECT id FROM games WHERE user_id = auth.uid())
    );

-- Draft Picks: Access through game ownership
CREATE POLICY "Users can manage draft picks" ON draft_picks
    FOR ALL USING (
        game_id IN (SELECT id FROM games WHERE user_id = auth.uid())
    );

-- Scouting Reports: Access through game ownership
CREATE POLICY "Users can manage scouting reports" ON scouting_reports
    FOR ALL USING (
        game_id IN (SELECT id FROM games WHERE user_id = auth.uid())
    );

-- Seasons: Access through game ownership
CREATE POLICY "Users can manage seasons" ON seasons
    FOR ALL USING (
        game_id IN (SELECT id FROM games WHERE user_id = auth.uid())
    );

-- Finances: Access through game ownership
CREATE POLICY "Users can manage finances" ON finances
    FOR ALL USING (
        game_id IN (SELECT id FROM games WHERE user_id = auth.uid())
    );

-- Game Events: Access through game ownership
CREATE POLICY "Users can manage game events" ON game_events
    FOR ALL USING (
        game_id IN (SELECT id FROM games WHERE user_id = auth.uid())
    );

-- AI Teams and Franchise Tiers are public read-only
ALTER TABLE ai_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE franchise_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read AI teams" ON ai_teams
    FOR SELECT USING (true);

CREATE POLICY "Anyone can read franchise tiers" ON franchise_tiers
    FOR SELECT USING (true);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_games_updated_at
    BEFORE UPDATE ON games
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_players_updated_at
    BEFORE UPDATE ON players
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_current_franchise_updated_at
    BEFORE UPDATE ON current_franchise
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_city_states_updated_at
    BEFORE UPDATE ON city_states
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_drafts_updated_at
    BEFORE UPDATE ON drafts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SEED DATA: AI Teams
-- ============================================

INSERT INTO ai_teams (id, name, city, abbreviation, philosophy, risk_tolerance, needs, base_strength, variance_multiplier) VALUES
    ('steel-city-hammers', 'Hammers', 'Steel City', 'SCH', 'best_available', 70, '[]', 52, 1.00),
    ('river-city-rapids', 'Rapids', 'River City', 'RCR', 'upside_swing', 80, '[]', 48, 1.30),
    ('canyon-town-coyotes', 'Coyotes', 'Canyon Town', 'CTC', 'upside_swing', 85, '[]', 45, 1.40),
    ('port-city-sailors', 'Sailors', 'Port City', 'PCS', 'safe_floor', 30, '[]', 50, 0.80),
    ('forest-city-foresters', 'Foresters', 'Forest City', 'FCF', 'safe_floor', 25, '[]', 51, 0.70),
    ('valley-town-vultures', 'Vultures', 'Valley Town', 'VTV', 'safe_floor', 20, '[]', 49, 0.75),
    ('coaltown-miners', 'Miners', 'Coaltown', 'CTM', 'need_based', 50, '[{"position": "SP", "priority": 90}, {"position": "RP", "priority": 70}]', 47, 1.00),
    ('mountain-town-mountaineers', 'Mountaineers', 'Mountain Town', 'MTM', 'need_based', 50, '[{"position": "C", "priority": 85}, {"position": "1B", "priority": 60}]', 48, 1.00),
    ('desert-springs-scorpions', 'Scorpions', 'Desert Springs', 'DSS', 'need_based', 55, '[{"position": "CF", "priority": 80}, {"position": "LF", "priority": 65}, {"position": "RF", "priority": 65}]', 46, 1.00),
    ('lakeside-lakers', 'Lakers', 'Lakeside', 'LSL', 'upside_swing', 60, '[]', 50, 1.20),
    ('bay-city-buccaneers', 'Buccaneers', 'Bay City', 'BCB', 'best_available', 45, '[]', 53, 0.90),
    ('prairie-plains-pioneers', 'Pioneers', 'Prairie Plains', 'PPP', 'best_available', 55, '[]', 49, 1.00),
    ('summit-heights-hawks', 'Hawks', 'Summit Heights', 'SHH', 'upside_swing', 65, '[]', 47, 1.10),
    ('riverside-royals', 'Royals', 'Riverside', 'RSR', 'safe_floor', 35, '[]', 52, 0.85),
    ('crossroads-cardinals', 'Cardinals', 'Crossroads', 'CRC', 'need_based', 50, '[{"position": "SS", "priority": 75}, {"position": "2B", "priority": 70}]', 50, 1.00),
    ('ironworks-ironmen', 'Ironmen', 'Ironworks', 'IWI', 'best_available', 60, '[]', 51, 1.00),
    ('harbor-town-hurricanes', 'Hurricanes', 'Harbor Town', 'HTH', 'upside_swing', 75, '[]', 46, 1.25),
    ('metro-city-meteors', 'Meteors', 'Metro City', 'MCM', 'safe_floor', 40, '[]', 54, 0.80),
    ('central-valley-condors', 'Condors', 'Central Valley', 'CVC', 'need_based', 45, '[{"position": "3B", "priority": 80}, {"position": "DH", "priority": 50}]', 48, 1.00);

-- ============================================
-- SEED DATA: Franchise Tiers
-- ============================================

INSERT INTO franchise_tiers (tier, name, budget, stadium_capacity, player_age_min, player_age_max, rating_min, rating_max, scouting_budget, ticket_price_min, ticket_price_max, city_population, unemployment_rate, median_income, promotion_requirements) VALUES
    ('LOW_A', 'Low-A', 500000, 2500, 18, 21, 30, 55, 50000, 5.00, 12.00, 15000, 18.00, 32000, '{"winPct": 0.55, "consecutiveYears": 2, "reserves": 50000, "cityPride": 50}'),
    ('HIGH_A', 'High-A', 2000000, 5000, 20, 23, 40, 65, 150000, 8.00, 20.00, 25000, 12.00, 38000, '{"winPct": 0.575, "consecutiveYears": 2, "reserves": 200000, "cityPride": 60, "divisionTitle": true}'),
    ('DOUBLE_A', 'Double-A', 8000000, 10000, 22, 25, 50, 72, 300000, 12.00, 35.00, 45000, 7.00, 48000, '{"winPct": 0.6, "consecutiveYears": 2, "reserves": 500000, "cityPride": 70, "divisionTitle": true}'),
    ('TRIPLE_A', 'Triple-A', 25000000, 18000, 23, 27, 60, 80, 500000, 18.00, 55.00, 85000, 4.00, 58000, '{"winPct": 0.6, "consecutiveYears": 2, "reserves": 2000000, "cityPride": 80, "leagueChampionship": true}'),
    ('MLB', 'MLB', 150000000, 42000, 24, 35, 70, 85, 2000000, 25.00, 150.00, 200000, 3.00, 72000, NULL);

-- ============================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON TABLE games IS 'Main save file table - one per user career';
COMMENT ON TABLE players IS 'All player records for a game (~1,000 per game over 20+ years)';
COMMENT ON TABLE current_franchise IS 'Current state of the player franchise (budget, stadium, coaching)';
COMMENT ON TABLE city_states IS 'City evolution tracking - population, pride, buildings';
COMMENT ON TABLE drafts IS 'Annual draft state and configuration';
COMMENT ON TABLE draft_prospects IS 'Available players for each years draft';
COMMENT ON TABLE draft_picks IS 'Historical record of all draft picks';
COMMENT ON TABLE scouting_reports IS 'Player scouting data with accuracy levels';
COMMENT ON TABLE seasons IS 'Season results - wins, losses, attendance';
COMMENT ON TABLE finances IS 'Yearly financial summaries';
COMMENT ON TABLE game_events IS 'Narrative moments and city events';
COMMENT ON TABLE ai_teams IS 'Static configuration for 19 AI competitor teams';
COMMENT ON TABLE franchise_tiers IS 'Static configuration for the 5 franchise tiers';
