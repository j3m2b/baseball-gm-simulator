-- ============================================
-- Narrative Events Enhancement
-- Adds event type constraint and active effects tracking
-- ============================================

-- Create enum for event types (if not exists approach using DO block)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'event_type') THEN
        CREATE TYPE event_type AS ENUM ('economic', 'team', 'city', 'story');
    END IF;
END$$;

-- Add check constraint for event type if column is varchar
-- (The table uses varchar, so we'll add a check constraint)
ALTER TABLE game_events DROP CONSTRAINT IF EXISTS game_events_type_check;
ALTER TABLE game_events ADD CONSTRAINT game_events_type_check
    CHECK (type IN ('economic', 'team', 'city', 'story', 'season_complete', 'draft_complete', 'promotion', 'city_growth', 'economic_milestone'));

-- Create table for active event effects (modifiers that persist across games/seasons)
CREATE TABLE IF NOT EXISTS active_effects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    event_id UUID REFERENCES game_events(id) ON DELETE SET NULL,

    -- Effect details
    effect_type VARCHAR(50) NOT NULL, -- 'attendance_modifier', 'revenue_modifier', etc.
    modifier DECIMAL(5,2) NOT NULL DEFAULT 1.00, -- Multiplier (0.85 = -15%, 1.15 = +15%)

    -- Duration
    start_year INTEGER NOT NULL,
    end_year INTEGER, -- NULL means permanent until removed
    is_active BOOLEAN NOT NULL DEFAULT true,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_active_effects_game_id ON active_effects(game_id);
CREATE INDEX IF NOT EXISTS idx_active_effects_active ON active_effects(game_id, is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE active_effects ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY "Users can manage own active effects" ON active_effects
    FOR ALL USING (
        game_id IN (SELECT id FROM games WHERE user_id = auth.uid())
    );

-- Add column for duration tracking on events
ALTER TABLE game_events ADD COLUMN IF NOT EXISTS duration_years INTEGER DEFAULT NULL;
ALTER TABLE game_events ADD COLUMN IF NOT EXISTS expires_year INTEGER DEFAULT NULL;

COMMENT ON TABLE active_effects IS 'Tracks active modifiers from narrative events (e.g., economic crash attendance penalty)';
COMMENT ON COLUMN active_effects.modifier IS 'Multiplier applied to the effect_type (0.85 = 15% reduction, 1.15 = 15% increase)';
COMMENT ON COLUMN game_events.duration_years IS 'How many years this event effect lasts (NULL = one-time event)';
COMMENT ON COLUMN game_events.expires_year IS 'Year when this event effect expires (NULL = immediate/permanent)';
