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
// ATTRIBUTE GENERATION
// ============================================

/**
 * Generate random rating within a range
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

/**
 * Generate complete prospect attributes
 */
export function generateProspectAttributes(
  tier: 'elite' | 'good' | 'average' | 'longshot'
): {
  currentRating: number;
  potential: number;
  hitterAttributes: HitterAttributes | null;
  pitcherAttributes: PitcherAttributes | null;
  hiddenTraits: HiddenTraits;
  position: Position;
  playerType: PlayerType;
  age: number;
} {
  const distribution = {
    elite: { potentialRange: { min: 65, max: 75 }, currentRange: { min: 50, max: 65 } },
    good: { potentialRange: { min: 55, max: 65 }, currentRange: { min: 45, max: 55 } },
    average: { potentialRange: { min: 45, max: 55 }, currentRange: { min: 40, max: 50 } },
    longshot: { potentialRange: { min: 35, max: 45 }, currentRange: { min: 30, max: 40 } },
  }[tier];

  const potential = randomRating(distribution.potentialRange.min, distribution.potentialRange.max);
  const currentRating = randomRating(
    Math.max(distribution.currentRange.min, potential - 20),
    Math.min(distribution.currentRange.max, potential - 5)
  );

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

  // Generate attributes
  const hitterAttributes = playerType === 'HITTER' ? generateHitterAttributes(currentRating) : null;
  const pitcherAttributes = playerType === 'PITCHER' ? generatePitcherAttributes(currentRating) : null;
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

// ============================================
// DRAFT CLASS GENERATION
// ============================================

export interface DraftClassConfig {
  totalPlayers?: number;
  gameId: string;
  draftYear: number;
}

/**
 * Generate a complete draft class of prospects
 */
export function generateDraftClass(config: DraftClassConfig): Omit<DraftProspect, 'prospectId'>[] {
  const { totalPlayers = DRAFT_CONFIG.TOTAL_PLAYERS, gameId, draftYear } = config;

  const prospects: Omit<DraftProspect, 'prospectId'>[] = [];

  // Calculate distribution counts
  const distribution = {
    elite: Math.floor(totalPlayers * 0.06),
    good: Math.floor(totalPlayers * 0.19),
    average: Math.floor(totalPlayers * 0.37),
    longshot: totalPlayers - Math.floor(totalPlayers * 0.06) -
              Math.floor(totalPlayers * 0.19) - Math.floor(totalPlayers * 0.37),
  };

  // Generate prospects by tier
  for (const [tier, count] of Object.entries(distribution)) {
    for (let i = 0; i < count; i++) {
      const { firstName, lastName } = generatePlayerName();
      const attributes = generateProspectAttributes(tier as keyof typeof distribution);

      prospects.push({
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
        traitsRevealed: false,
        scoutedRating: null,
        scoutedPotential: null,
        scoutingAccuracy: null,
        isDrafted: false,
        draftedByTeam: null,
      });
    }
  }

  // Shuffle to randomize order
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
