-- ============================================
-- Baseball GM Simulator - Player Training System
-- Adds training focus and XP progression fields
-- ============================================

-- Add training columns to players table
ALTER TABLE players
ADD COLUMN IF NOT EXISTS training_focus VARCHAR(20) NOT NULL DEFAULT 'overall',
ADD COLUMN IF NOT EXISTS current_xp INTEGER NOT NULL DEFAULT 0 CHECK (current_xp >= 0 AND current_xp <= 100),
ADD COLUMN IF NOT EXISTS progression_rate DECIMAL(3,2) NOT NULL DEFAULT 1.00 CHECK (progression_rate >= 0.50 AND progression_rate <= 2.00);

-- Add training columns to draft_prospects table (for initial values)
ALTER TABLE draft_prospects
ADD COLUMN IF NOT EXISTS training_focus VARCHAR(20) NOT NULL DEFAULT 'overall',
ADD COLUMN IF NOT EXISTS current_xp INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS progression_rate DECIMAL(3,2) NOT NULL DEFAULT 1.00;

-- Create index for querying players by training focus
CREATE INDEX IF NOT EXISTS idx_players_training_focus ON players(game_id, training_focus);

-- ============================================
-- HELPER FUNCTION: Calculate Progression Rate
-- Based on age and potential
-- ============================================

CREATE OR REPLACE FUNCTION calculate_progression_rate(
  p_age INTEGER,
  p_potential INTEGER,
  p_current_rating INTEGER
) RETURNS DECIMAL(3,2) AS $$
DECLARE
  age_factor DECIMAL(3,2);
  potential_factor DECIMAL(3,2);
  ceiling_factor DECIMAL(3,2);
  final_rate DECIMAL(3,2);
BEGIN
  -- Age factor: Younger players develop faster
  -- 18-21: 1.5x, 22-25: 1.2x, 26-28: 1.0x, 29+: 0.7x
  age_factor := CASE
    WHEN p_age <= 21 THEN 1.50
    WHEN p_age <= 25 THEN 1.20
    WHEN p_age <= 28 THEN 1.00
    ELSE 0.70
  END;

  -- Potential factor: Higher potential = faster development
  -- 70+: 1.3x, 60-69: 1.1x, 50-59: 1.0x, <50: 0.8x
  potential_factor := CASE
    WHEN p_potential >= 70 THEN 1.30
    WHEN p_potential >= 60 THEN 1.10
    WHEN p_potential >= 50 THEN 1.00
    ELSE 0.80
  END;

  -- Ceiling factor: Harder to improve when close to potential
  -- Gap of 15+: 1.2x, 10-14: 1.0x, 5-9: 0.8x, <5: 0.5x
  ceiling_factor := CASE
    WHEN (p_potential - p_current_rating) >= 15 THEN 1.20
    WHEN (p_potential - p_current_rating) >= 10 THEN 1.00
    WHEN (p_potential - p_current_rating) >= 5 THEN 0.80
    ELSE 0.50
  END;

  -- Combine factors (clamped to 0.5-2.0)
  final_rate := GREATEST(0.50, LEAST(2.00, age_factor * potential_factor * ceiling_factor));

  RETURN final_rate;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- TRIGGER: Auto-calculate progression rate on insert/update
-- ============================================

CREATE OR REPLACE FUNCTION update_player_progression_rate()
RETURNS TRIGGER AS $$
BEGIN
  -- Only recalculate if relevant fields changed
  IF (TG_OP = 'INSERT') OR
     (OLD.age IS DISTINCT FROM NEW.age) OR
     (OLD.potential IS DISTINCT FROM NEW.potential) OR
     (OLD.current_rating IS DISTINCT FROM NEW.current_rating) THEN
    NEW.progression_rate := calculate_progression_rate(NEW.age, NEW.potential, NEW.current_rating);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for players table
DROP TRIGGER IF EXISTS trigger_update_player_progression_rate ON players;
CREATE TRIGGER trigger_update_player_progression_rate
  BEFORE INSERT OR UPDATE ON players
  FOR EACH ROW
  EXECUTE FUNCTION update_player_progression_rate();

-- ============================================
-- UPDATE EXISTING PLAYERS with calculated progression rates
-- ============================================

UPDATE players
SET progression_rate = calculate_progression_rate(age, potential, current_rating)
WHERE progression_rate = 1.00;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON COLUMN players.training_focus IS 'Current skill being trained: hit, power, speed, arm, field (hitters) or stuff, control, movement (pitchers) or overall';
COMMENT ON COLUMN players.current_xp IS 'Experience points towards next rating increase (0-100). At 100, rating increases by 1.';
COMMENT ON COLUMN players.progression_rate IS 'Hidden development multiplier (0.5-2.0) based on age, potential, and ceiling room';
