// ============================================
// Draft Simulation Engine
// Player generation, scouting, and AI drafting
// ============================================

import type {
  DraftProspect,
  Position,
  PlayerType,
  WorkEthic,
  Personality,
  HitterAttributes,
  PitcherAttributes,
  HiddenTraits,
  AITeam,
  ScoutingTier,
  Archetype,
  SCOUTING_CONFIG,
  PROSPECT_DISTRIBUTION,
} from '@/lib/types';

// ============================================
// CONFIGURATION
// ============================================

const DRAFT_CONFIG = {
  TOTAL_PLAYERS: 800,
  ROUNDS: 40,
  TEAMS: 20,

  // Position distribution
  POSITION_WEIGHTS: {
    SP: 0.25,
    RP: 0.15,
    C: 0.05,
    '1B': 0.07,
    '2B': 0.07,
    '3B': 0.07,
    SS: 0.07,
    LF: 0.09,
    CF: 0.09,
    RF: 0.09,
  } as Record<Position, number>,

  // Age distribution (18-22)
  AGE_WEIGHTS: {
    18: 0.15,
    19: 0.25,
    20: 0.30,
    21: 0.20,
    22: 0.10,
  } as Record<number, number>,
};

// ============================================
// NAME GENERATION
// ============================================

const FIRST_NAMES = [
  // American
  "Jake", "Mike", "Chris", "Matt", "Ryan", "Josh", "Tyler", "Brandon", "Justin", "Kyle",
  "Derek", "Kevin", "Adam", "Jason", "Brian", "Eric", "Andrew", "David", "James", "John",
  "Marcus", "Terrence", "Darius", "DeShawn", "Jamal", "Antonio", "Carlos", "Miguel",
  // Latino
  "Jose", "Juan", "Carlos", "Luis", "Pedro", "Rafael", "Fernando", "Roberto", "Eduardo", "Andres",
  "Diego", "Alejandro", "Gabriel", "Ricardo", "Victor", "Angel", "Francisco", "Manuel", "Hector", "Sergio",
  // Asian
  "Hiroshi", "Kenji", "Takeshi", "Yuki", "Shohei", "Kenta", "Masahiro", "Daisuke", "Ichiro", "Hideki",
  "Min-ho", "Sung-jin", "Ji-hoon", "Hyun-woo", "Seung-hwan", "Wei", "Chen", "Ming", "Lei", "Ping",
];

const LAST_NAMES = [
  // American
  "Johnson", "Williams", "Brown", "Jones", "Miller", "Davis", "Wilson", "Moore", "Taylor", "Anderson",
  "Thomas", "Jackson", "White", "Harris", "Martin", "Thompson", "Garcia", "Martinez", "Robinson", "Clark",
  "Rodriguez", "Lewis", "Lee", "Walker", "Hall", "Allen", "Young", "King", "Wright", "Scott",
  // Latino
  "Gonzalez", "Lopez", "Hernandez", "Ramirez", "Torres", "Flores", "Rivera", "Gomez", "Sanchez", "Morales",
  "Ortiz", "Diaz", "Cruz", "Reyes", "Vargas", "Castillo", "Mendez", "Ramos", "Herrera", "Medina",
  // Asian
  "Suzuki", "Tanaka", "Yamamoto", "Watanabe", "Nakamura", "Kobayashi", "Takahashi", "Saito", "Matsui", "Ohtani",
  "Kim", "Park", "Lee", "Choi", "Jung", "Kang", "Chen", "Wang", "Zhang", "Liu",
];

function generatePlayerName(): { firstName: string; lastName: string } {
  const firstName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
  const lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
  return { firstName, lastName };
}

// ============================================
// GAUSSIAN DISTRIBUTION (Box-Muller Transform)
// ============================================

/**
 * Generate a random number from a normal (Gaussian) distribution
 * using the Box-Muller transform.
 *
 * This creates a bell curve where:
 * - ~68% of values fall within 1 standard deviation of the mean
 * - ~95% of values fall within 2 standard deviations
 * - ~99.7% of values fall within 3 standard deviations
 *
 * For ratings with mean=50, stdDev=15:
 * - Rating 50 (average) is most common
 * - Rating 65 (~1 std dev) is top ~16%
 * - Rating 80 (~2 std dev) is top ~2.5% (elite/star)
 * - Rating 20 (~2 std dev below) is bottom ~2.5%
 */
function randomNormal(mean: number, stdDev: number): number {
  // Box-Muller transform: generates two independent standard normal values
  // We only use one of them for simplicity
  let u1 = Math.random();
  let u2 = Math.random();

  // Avoid log(0)
  while (u1 === 0) u1 = Math.random();

  // Standard normal (mean=0, stdDev=1)
  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);

  // Scale to desired mean and standard deviation
  return mean + z0 * stdDev;
}

/**
 * Generate a rating using Gaussian distribution, clamped to valid range
 */
function randomGaussianRating(mean: number = 50, stdDev: number = 15): number {
  const value = randomNormal(mean, stdDev);
  // Clamp to 20-80 range (the baseball scouting scale)
  return Math.round(Math.max(20, Math.min(80, value)));
}

// ============================================
// ATTRIBUTE GENERATION
// ============================================

/**
 * Generate random rating within a range (uniform distribution)
 * Used for attribute variance, not main rating generation
 */
function randomRating(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generate hitter attributes based on overall rating
 */
export function generateHitterAttributes(overallRating: number): HitterAttributes {
  // Create variance around the overall rating (±10 points)
  const variance = () => randomRating(-10, 10);

  return {
    hit: Math.max(20, Math.min(80, overallRating + variance())),
    power: Math.max(20, Math.min(80, overallRating + variance())),
    speed: Math.max(20, Math.min(80, overallRating + variance())),
    arm: Math.max(20, Math.min(80, overallRating + variance())),
    field: Math.max(20, Math.min(80, overallRating + variance())),
  };
}

/**
 * Generate pitcher attributes based on overall rating
 */
export function generatePitcherAttributes(overallRating: number): PitcherAttributes {
  const variance = () => randomRating(-10, 10);

  return {
    stuff: Math.max(20, Math.min(80, overallRating + variance())),
    control: Math.max(20, Math.min(80, overallRating + variance())),
    movement: Math.max(20, Math.min(80, overallRating + variance())),
  };
}

/**
 * Generate hidden traits for a player
 */
export function generateHiddenTraits(): HiddenTraits {
  // Work ethic distribution: 20% poor, 60% average, 20% excellent
  const workEthicRoll = Math.random();
  let workEthic: WorkEthic;
  if (workEthicRoll < 0.20) {
    workEthic = 'poor';
  } else if (workEthicRoll < 0.80) {
    workEthic = 'average';
  } else {
    workEthic = 'excellent';
  }

  // Injury prone: 20% chance
  const injuryProne = Math.random() < 0.20;

  // Personality distribution: 70% team player, 15% prima donna, 15% leader
  const personalityRoll = Math.random();
  let personality: Personality;
  if (personalityRoll < 0.70) {
    personality = 'team_player';
  } else if (personalityRoll < 0.85) {
    personality = 'prima_donna';
  } else {
    personality = 'leader';
  }

  return {
    workEthic,
    injuryProne,
    personality,
    coachability: randomRating(30, 70),
    clutch: randomRating(30, 70),
  };
}

// ============================================
// ARCHETYPE DETERMINATION
// ============================================

/**
 * Determine player archetype based on their attributes
 * Returns a descriptive archetype that gives insight without revealing exact ratings
 */
export function determineArchetype(
  playerType: PlayerType,
  hitterAttributes: HitterAttributes | null,
  pitcherAttributes: PitcherAttributes | null,
  potential: number,
  currentRating: number
): Archetype {
  // If potential is much higher than current, they're "Raw Talent"
  if (potential - currentRating >= 15) {
    return 'Raw Talent';
  }

  if (playerType === 'HITTER' && hitterAttributes) {
    const { hit, power, speed, arm, field } = hitterAttributes;
    const attrs = [
      { name: 'power', value: power },
      { name: 'speed', value: speed },
      { name: 'hit', value: hit },
      { name: 'field', value: field },
      { name: 'arm', value: arm },
    ];

    // Sort to find dominant attribute
    attrs.sort((a, b) => b.value - a.value);
    const dominant = attrs[0];
    const second = attrs[1];

    // Check if they're balanced (top 2 within 5 points of each other)
    const range = attrs[0].value - attrs[4].value;
    if (range <= 12) {
      return 'Playmaker';
    }

    // Dominant attribute determines archetype
    if (dominant.name === 'power' && dominant.value >= 55) {
      return 'Slugger';
    }
    if (dominant.name === 'speed' && dominant.value >= 55) {
      return 'Speedster';
    }
    if (dominant.name === 'hit' && dominant.value >= 55) {
      return 'Contact King';
    }
    if (dominant.name === 'field' && dominant.value >= 55) {
      return 'Glove Wizard';
    }
    if (dominant.name === 'arm' && dominant.value >= 55) {
      return 'Cannon Arm';
    }

    // Fallback based on highest stat name
    if (dominant.name === 'power') return 'Slugger';
    if (dominant.name === 'speed') return 'Speedster';
    if (dominant.name === 'hit') return 'Contact King';
    if (dominant.name === 'field') return 'Glove Wizard';
    if (dominant.name === 'arm') return 'Cannon Arm';

    return 'Playmaker';
  }

  if (playerType === 'PITCHER' && pitcherAttributes) {
    const { stuff, control, movement } = pitcherAttributes;
    const attrs = [
      { name: 'stuff', value: stuff },
      { name: 'control', value: control },
      { name: 'movement', value: movement },
    ];

    attrs.sort((a, b) => b.value - a.value);
    const dominant = attrs[0];

    // Check if balanced
    const range = attrs[0].value - attrs[2].value;
    if (range <= 8) {
      return 'Playmaker';
    }

    if (dominant.name === 'stuff' && dominant.value >= 55) {
      return 'Flamethrower';
    }
    if (dominant.name === 'control' && dominant.value >= 55) {
      return 'Command Ace';
    }
    if (dominant.name === 'movement' && dominant.value >= 55) {
      return 'Movement Master';
    }

    // Fallback
    if (dominant.name === 'stuff') return 'Flamethrower';
    if (dominant.name === 'control') return 'Command Ace';
    if (dominant.name === 'movement') return 'Movement Master';

    return 'Playmaker';
  }

  return 'Playmaker';
}

// ============================================
// MEDIA RANK CALCULATION
// ============================================

/**
 * Calculate media consensus rank (1-800) for a prospect
 * Based primarily on potential with noise to simulate imperfect media scouting
 */
export function calculateMediaRank(
  potential: number,
  currentRating: number,
  age: number,
  allProspects: Array<{ potential: number; currentRating: number; age: number; noise?: number }>
): number {
  // Add noise to potential for media ranking
  // Noise is higher for younger players (more unknown)
  const ageNoiseFactor = Math.max(0, 22 - age) * 2; // 0-8 extra noise for age
  const baseNoise = (Math.random() * 16) - 8; // ±8 base noise
  const totalNoise = baseNoise + ((Math.random() * ageNoiseFactor) - ageNoiseFactor / 2);

  // Media "perceived" value: weighted toward potential but considers current
  const mediaScore = (potential * 0.75) + (currentRating * 0.25) + totalNoise;

  // Sort all prospects by their media score to get rank
  const scoresWithIndex = allProspects.map((p, idx) => {
    const pAgeNoise = Math.max(0, 22 - p.age) * 2;
    const pNoise = p.noise ?? ((Math.random() * 16) - 8 + ((Math.random() * pAgeNoise) - pAgeNoise / 2));
    return {
      score: (p.potential * 0.75) + (p.currentRating * 0.25) + pNoise,
      idx,
    };
  });

  scoresWithIndex.sort((a, b) => b.score - a.score);

  // Find this prospect's rank (1-based)
  const thisScore = mediaScore;
  let rank = 1;
  for (const item of scoresWithIndex) {
    if (Math.abs(item.score - thisScore) < 0.001) {
      break;
    }
    rank++;
  }

  return Math.min(800, Math.max(1, rank));
}

/**
 * Generate complete prospect attributes using Gaussian distribution
 *
 * Uses Box-Muller transform to create realistic talent distribution:
 * - Mean potential: 50 (average player)
 * - Standard deviation: 15
 * - This means:
 *   - ~68% have potential between 35-65 (average to good)
 *   - ~95% have potential between 20-80 (almost all players)
 *   - ~2.5% have potential 65+ (true stars, top prospects)
 *   - ~0.1% have potential 75+ (generational talents)
 *
 * Current rating is derived from potential with a gap (room to grow)
 */
export function generateProspectAttributes(): {
  currentRating: number;
  potential: number;
  hitterAttributes: HitterAttributes | null;
  pitcherAttributes: PitcherAttributes | null;
  hiddenTraits: HiddenTraits;
  position: Position;
  playerType: PlayerType;
  age: number;
} {
  // Generate potential using Gaussian distribution
  // Mean=50, StdDev=15 creates realistic talent scarcity
  const potential = randomGaussianRating(50, 15);

  // Current rating is below potential (players have room to develop)
  // Gap ranges from 5-20 points, with younger players having bigger gaps
  const developmentGap = randomRating(5, 20);
  const currentRating = Math.max(20, Math.min(80, potential - developmentGap));

  // Select position with weighted random
  const positionRoll = Math.random();
  let cumulative = 0;
  let position: Position = 'RF';
  for (const [pos, weight] of Object.entries(DRAFT_CONFIG.POSITION_WEIGHTS)) {
    cumulative += weight;
    if (positionRoll <= cumulative) {
      position = pos as Position;
      break;
    }
  }

  const playerType: PlayerType = (position === 'SP' || position === 'RP') ? 'PITCHER' : 'HITTER';

  // Generate attributes using Gaussian distribution for each attribute
  // This creates players with varied strengths (some tools better than others)
  const hitterAttributes = playerType === 'HITTER' ? generateHitterAttributesGaussian(currentRating) : null;
  const pitcherAttributes = playerType === 'PITCHER' ? generatePitcherAttributesGaussian(currentRating) : null;
  const hiddenTraits = generateHiddenTraits();

  // Select age with weighted random
  const ageRoll = Math.random();
  let ageCumulative = 0;
  let age = 20;
  for (const [ageStr, weight] of Object.entries(DRAFT_CONFIG.AGE_WEIGHTS)) {
    ageCumulative += weight;
    if (ageRoll <= ageCumulative) {
      age = parseInt(ageStr);
      break;
    }
  }

  return {
    currentRating,
    potential,
    hitterAttributes,
    pitcherAttributes,
    hiddenTraits,
    position,
    playerType,
    age,
  };
}

/**
 * Generate hitter attributes using Gaussian distribution around overall rating
 * Creates more varied tool profiles (five-tool players are rare)
 */
function generateHitterAttributesGaussian(overallRating: number): HitterAttributes {
  // Each tool varies around the overall with stdDev of 8
  // This creates distinct player profiles (sluggers, speedsters, etc.)
  const generateTool = () => {
    const value = randomNormal(overallRating, 8);
    return Math.round(Math.max(20, Math.min(80, value)));
  };

  return {
    hit: generateTool(),
    power: generateTool(),
    speed: generateTool(),
    arm: generateTool(),
    field: generateTool(),
  };
}

/**
 * Generate pitcher attributes using Gaussian distribution
 */
function generatePitcherAttributesGaussian(overallRating: number): PitcherAttributes {
  const generateTool = () => {
    const value = randomNormal(overallRating, 8);
    return Math.round(Math.max(20, Math.min(80, value)));
  };

  return {
    stuff: generateTool(),
    control: generateTool(),
    movement: generateTool(),
  };
}

// ============================================
// DRAFT CLASS GENERATION
// ============================================

export interface DraftClassConfig {
  totalPlayers?: number;
  gameId: string;
  draftYear: number;
}

/**
 * Generate a complete draft class of prospects using Gaussian distribution
 *
 * The Gaussian distribution naturally creates talent scarcity:
 * - Most players cluster around average (potential ~50)
 * - Elite prospects (potential 70+) are statistically rare (~2.5%)
 * - Generational talents (potential 75+) are extremely rare (~0.5%)
 *
 * Media ranks are calculated AFTER all prospects are generated,
 * ensuring a proper spread from #1 to #800.
 */
export function generateDraftClass(config: DraftClassConfig): Omit<DraftProspect, 'prospectId'>[] {
  const { totalPlayers = DRAFT_CONFIG.TOTAL_PLAYERS } = config;

  // First pass: generate all prospects without media rank
  const rawProspects: Array<{
    firstName: string;
    lastName: string;
    age: number;
    position: Position;
    playerType: PlayerType;
    currentRating: number;
    potential: number;
    hitterAttributes: HitterAttributes | null;
    pitcherAttributes: PitcherAttributes | null;
    hiddenTraits: HiddenTraits;
    archetype: Archetype;
    noise: number;  // Store noise for consistent media rank calculation
  }> = [];

  // Generate all prospects using Gaussian distribution
  // No more tier-based generation - the bell curve naturally creates
  // the right distribution of elite/good/average/longshot players
  for (let i = 0; i < totalPlayers; i++) {
    const { firstName, lastName } = generatePlayerName();
    const attributes = generateProspectAttributes();

    // Determine archetype based on attributes
    const archetype = determineArchetype(
      attributes.playerType,
      attributes.hitterAttributes,
      attributes.pitcherAttributes,
      attributes.potential,
      attributes.currentRating
    );

    // Pre-calculate noise for consistent media ranking
    // Younger players have more noise (more unknown quantity)
    const ageNoiseFactor = Math.max(0, 22 - attributes.age) * 2;
    const noise = (Math.random() * 16) - 8 + ((Math.random() * ageNoiseFactor) - ageNoiseFactor / 2);

    rawProspects.push({
      firstName,
      lastName,
      age: attributes.age,
      position: attributes.position,
      playerType: attributes.playerType,
      currentRating: attributes.currentRating,
      potential: attributes.potential,
      hitterAttributes: attributes.hitterAttributes,
      pitcherAttributes: attributes.pitcherAttributes,
      hiddenTraits: attributes.hiddenTraits,
      archetype,
      noise,
    });
  }

  // Calculate media scores for all prospects
  const mediaScores = rawProspects.map((p, idx) => ({
    score: (p.potential * 0.75) + (p.currentRating * 0.25) + p.noise,
    idx,
  }));

  // Sort by score to get rankings
  mediaScores.sort((a, b) => b.score - a.score);

  // Create rank lookup
  const rankLookup = new Map<number, number>();
  mediaScores.forEach((item, rank) => {
    rankLookup.set(item.idx, rank + 1);
  });

  // Build final prospects array with media ranks
  const prospects: Omit<DraftProspect, 'prospectId'>[] = rawProspects.map((p, idx) => ({
    firstName: p.firstName,
    lastName: p.lastName,
    age: p.age,
    position: p.position,
    playerType: p.playerType,
    currentRating: p.currentRating,
    potential: p.potential,
    hitterAttributes: p.hitterAttributes,
    pitcherAttributes: p.pitcherAttributes,
    hiddenTraits: p.hiddenTraits,
    traitsRevealed: false,
    scoutedRating: null,
    scoutedPotential: null,
    scoutingAccuracy: null,
    isDrafted: false,
    draftedByTeam: null,
    archetype: p.archetype,
    mediaRank: rankLookup.get(idx) ?? 800,
  }));

  // Shuffle to randomize display order (but media rank is preserved)
  for (let i = prospects.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [prospects[i], prospects[j]] = [prospects[j], prospects[i]];
  }

  return prospects;
}

// ============================================
// SCOUTING SYSTEM
// ============================================

export interface ScoutingResult {
  scoutedRating: number;
  scoutedPotential: number;
  ratingError: number;
  potentialError: number;
  traitsRevealed: boolean;
  revealedTraits: Partial<HiddenTraits>;
  cost: number;
}

const SCOUTING_COSTS: Record<ScoutingTier, { cost: number; error: number; traitChance: number }> = {
  low: { cost: 2000, error: 15, traitChance: 0.30 },
  medium: { cost: 4000, error: 8, traitChance: 0.60 },
  high: { cost: 8000, error: 3, traitChance: 0.90 },
};

/**
 * Scout a prospect and generate a scouting report
 */
export function scoutProspect(
  prospect: Omit<DraftProspect, 'prospectId'>,
  accuracy: ScoutingTier
): ScoutingResult {
  const config = SCOUTING_COSTS[accuracy];

  // Generate rating error
  const ratingError = Math.floor((Math.random() * 2 - 1) * config.error);
  const potentialError = Math.floor((Math.random() * 2 - 1) * config.error);

  const scoutedRating = Math.max(20, Math.min(80, prospect.currentRating + ratingError));
  const scoutedPotential = Math.max(20, Math.min(80, prospect.potential + potentialError));

  // Check trait discovery
  const traitsRevealed = Math.random() < config.traitChance;
  const revealedTraits: Partial<HiddenTraits> = {};

  if (traitsRevealed) {
    // Reveal work ethic and personality always if traits revealed
    revealedTraits.workEthic = prospect.hiddenTraits.workEthic;
    revealedTraits.personality = prospect.hiddenTraits.personality;

    // 50% chance to reveal injury prone
    if (Math.random() < 0.5) {
      revealedTraits.injuryProne = prospect.hiddenTraits.injuryProne;
    }

    // 70% chance to reveal coachability
    if (Math.random() < 0.7) {
      revealedTraits.coachability = prospect.hiddenTraits.coachability;
    }

    // 50% chance to reveal clutch
    if (Math.random() < 0.5) {
      revealedTraits.clutch = prospect.hiddenTraits.clutch;
    }
  }

  return {
    scoutedRating,
    scoutedPotential,
    ratingError: Math.abs(ratingError),
    potentialError: Math.abs(potentialError),
    traitsRevealed,
    revealedTraits,
    cost: config.cost,
  };
}

/**
 * Calculate scouting cost for a given accuracy tier
 */
export function calculateScoutingCost(accuracy: ScoutingTier): number {
  return SCOUTING_COSTS[accuracy].cost;
}

// ============================================
// AI DRAFT LOGIC
// ============================================

export interface AIDraftPickResult {
  selectedProspect: Omit<DraftProspect, 'prospectId'>;
  prospectIndex: number;
  score: number;
  reason: string;
}

/**
 * AI team makes a draft pick
 *
 * From PRD:
 * - best_available: Pure talent
 * - need_based: Fill roster holes
 * - upside_swing: High ceiling picks
 * - safe_floor: Avoid variance
 */
export function aiDraftPick(
  team: AITeam,
  availableProspects: Omit<DraftProspect, 'prospectId'>[],
  round: number
): AIDraftPickResult {
  const scores: { prospect: Omit<DraftProspect, 'prospectId'>; index: number; score: number; reason: string }[] = [];

  for (let i = 0; i < availableProspects.length; i++) {
    const prospect = availableProspects[i];

    // Base score is the prospect's true rating (AI has imperfect knowledge too)
    const aiScoutingError = (Math.random() * 10) - 5;
    let score = prospect.currentRating + aiScoutingError;
    let reason = 'best available';

    switch (team.philosophy) {
      case 'best_available':
        // No modification, use raw talent
        break;

      case 'need_based':
        // Check if position matches a need
        const positionNeed = team.needs.find(n => n.position === prospect.position);
        if (positionNeed) {
          score += positionNeed.priority / 5;  // Up to +20 for high-priority needs
          reason = `filling need at ${prospect.position}`;
        }
        break;

      case 'upside_swing':
        // Bonus for high ceiling
        const upside = prospect.potential - prospect.currentRating;
        score += upside * 2;
        reason = 'high ceiling prospect';
        break;

      case 'safe_floor':
        // Penalty for variance
        const variance = prospect.potential - prospect.currentRating;
        score -= variance;
        if (prospect.hiddenTraits.injuryProne && team.riskTolerance < 50) {
          score -= (50 - team.riskTolerance) / 5;
          reason = 'safe, low-risk pick';
        }
        break;
    }

    // Risk tolerance adjustment for injury-prone players
    if (prospect.hiddenTraits.injuryProne && team.riskTolerance < 50) {
      score -= (50 - team.riskTolerance) / 5;
    }

    // Add random variance (AI makes mistakes)
    score += (Math.random() * 10) - 5;

    scores.push({ prospect, index: i, score, reason });
  }

  // Sort by score
  scores.sort((a, b) => b.score - a.score);

  // Pick from top 3 to add unpredictability (except in round 1)
  const topN = round === 1 ? 1 : 3;
  const pickPool = scores.slice(0, Math.min(topN, scores.length));
  const selected = pickPool[Math.floor(Math.random() * pickPool.length)];

  return {
    selectedProspect: selected.prospect,
    prospectIndex: selected.index,
    score: selected.score,
    reason: selected.reason,
  };
}

/**
 * Simulate AI picks until it's the player's turn
 */
export function simulateAIDraftPicks(
  aiTeams: AITeam[],
  availableProspects: Omit<DraftProspect, 'prospectId'>[],
  currentPick: number,
  playerDraftPosition: number,
  round: number,
  isSnakeDraft: boolean = true
): {
  picks: { teamId: string; prospectIndex: number; pick: number }[];
  remainingProspects: Omit<DraftProspect, 'prospectId'>[];
  nextPick: number;
} {
  const picks: { teamId: string; prospectIndex: number; pick: number }[] = [];
  let remaining = [...availableProspects];
  let pick = currentPick;

  // Calculate actual pick position in round considering snake draft
  const getPickPositionInRound = (pickNum: number, roundNum: number): number => {
    const posInRound = ((pickNum - 1) % 20) + 1;
    if (isSnakeDraft && roundNum % 2 === 0) {
      return 21 - posInRound;  // Reverse for even rounds
    }
    return posInRound;
  };

  while (getPickPositionInRound(pick, round) !== playerDraftPosition && remaining.length > 0) {
    const posInRound = getPickPositionInRound(pick, round);

    // Find which AI team picks at this position
    // AI teams fill positions 1-20 except player's position
    const aiTeamIndex = posInRound <= playerDraftPosition
      ? posInRound - 1
      : posInRound - 2;

    if (aiTeamIndex >= 0 && aiTeamIndex < aiTeams.length) {
      const aiTeam = aiTeams[aiTeamIndex];
      const result = aiDraftPick(aiTeam, remaining, round);

      picks.push({
        teamId: aiTeam.id,
        prospectIndex: result.prospectIndex,
        pick,
      });

      // Remove selected prospect
      remaining = remaining.filter((_, i) => i !== result.prospectIndex);
    }

    pick++;

    // Check if we've reached player's turn
    if (getPickPositionInRound(pick, round) === playerDraftPosition) {
      break;
    }

    // Check if round is complete
    if (pick > round * 20) {
      break;
    }
  }

  return {
    picks,
    remainingProspects: remaining,
    nextPick: pick,
  };
}
