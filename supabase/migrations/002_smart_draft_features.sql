-- Add Smart Draft features to draft_prospects table
-- This adds media_rank and archetype columns for improved draft experience

-- Add media_rank column (consensus rank 1-800)
ALTER TABLE draft_prospects
ADD COLUMN IF NOT EXISTS media_rank INTEGER DEFAULT 400;

-- Add archetype column (player type based on attributes)
ALTER TABLE draft_prospects
ADD COLUMN IF NOT EXISTS archetype TEXT DEFAULT 'Playmaker';

-- Add index for media_rank to speed up sorting
CREATE INDEX IF NOT EXISTS idx_draft_prospects_media_rank ON draft_prospects (game_id, draft_year, media_rank);

-- Update any existing NULL values
UPDATE draft_prospects SET media_rank = 400 WHERE media_rank IS NULL;
UPDATE draft_prospects SET archetype = 'Playmaker' WHERE archetype IS NULL;

-- Make columns NOT NULL after setting defaults
ALTER TABLE draft_prospects ALTER COLUMN media_rank SET NOT NULL;
ALTER TABLE draft_prospects ALTER COLUMN archetype SET NOT NULL;

COMMENT ON COLUMN draft_prospects.media_rank IS 'Consensus media ranking (1-800), lower is better';
COMMENT ON COLUMN draft_prospects.archetype IS 'Player archetype based on dominant attributes (Slugger, Speedster, etc.)';
