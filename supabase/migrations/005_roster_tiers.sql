-- ============================================
-- Two-Tier Roster System Migration
-- Adds roster_status to players and facility_level to franchise
-- ============================================

-- Add roster_status column to players table
-- ACTIVE = 25-man active roster
-- RESERVE = Farm system / reserves
ALTER TABLE players ADD COLUMN IF NOT EXISTS roster_status VARCHAR(10) NOT NULL DEFAULT 'ACTIVE';

-- Add check constraint for valid roster status values
ALTER TABLE players DROP CONSTRAINT IF EXISTS players_roster_status_check;
ALTER TABLE players ADD CONSTRAINT players_roster_status_check
    CHECK (roster_status IN ('ACTIVE', 'RESERVE'));

-- Add facility_level column to current_franchise table
-- Level 0: Basic Dugout (25 Active, 5 Reserve)
-- Level 1: Minor League Complex (+15 Reserve slots = 20 total)
-- Level 2: Player Development Lab (+20 Reserve slots = 40 total)
ALTER TABLE current_franchise ADD COLUMN IF NOT EXISTS facility_level INTEGER NOT NULL DEFAULT 0;

-- Add check constraint for valid facility levels
ALTER TABLE current_franchise DROP CONSTRAINT IF EXISTS current_franchise_facility_level_check;
ALTER TABLE current_franchise ADD CONSTRAINT current_franchise_facility_level_check
    CHECK (facility_level >= 0 AND facility_level <= 2);

-- Create index for faster roster queries
CREATE INDEX IF NOT EXISTS idx_players_roster_status ON players(game_id, roster_status);
CREATE INDEX IF NOT EXISTS idx_players_on_roster ON players(game_id, is_on_roster, roster_status);

-- Comments for documentation
COMMENT ON COLUMN players.roster_status IS 'Player roster tier: ACTIVE (25-man) or RESERVE (farm system)';
COMMENT ON COLUMN current_franchise.facility_level IS 'Facility upgrade level: 0=Basic (5 reserve), 1=Complex (20 reserve), 2=Lab (40 reserve)';
