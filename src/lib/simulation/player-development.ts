// ============================================
// Player Development Simulation Engine
// Implements the exact formula from the PRD
// ============================================

import type {
  Player,
  PlayerGrowthResult,
  Tier,
  WorkEthic,
  TIER_CONFIGS,
} from '@/lib/types';

// ============================================
// CONFIGURATION CONSTANTS
// ============================================

const GROWTH_CONFIG = {
  BASE_GROWTH_MULTIPLIER: 0.15,

  // Age modifiers
  AGE_YOUNG_THRESHOLD: 24,
  AGE_YOUNG_MODIFIER: 1.2,
  AGE_OLD_THRESHOLD: 28,
  AGE_OLD_MODIFIER: 0.7,
  AGE_NORMAL_MODIFIER: 1.0,

  // Component ranges
  COACHING_MODIFIER_RANGE: 3,      // ±3
  PLAYING_TIME_MODIFIER_RANGE: 1.5, // ±1.5
  TIER_APPROPRIATENESS_RANGE: 2,   // ±2
  WORK_ETHIC_RANGE: 2,             // ±2
  INJURY_PENALTY: -3,

  // Random variance (±20%)
  RANDOM_VARIANCE_PCT: 0.20,

  // Final clamp
  MIN_GROWTH: -5,
  MAX_GROWTH: 5,

  // Rating bounds
  MIN_RATING: 20,
  MAX_RATING: 80,
};

// Work ethic to modifier mapping
const WORK_ETHIC_MODIFIERS: Record<WorkEthic, number> = {
  poor: -2,
  average: 0,
  excellent: 2,
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Clamp a value between min and max
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Generate random variance within a percentage range
 * Returns a multiplier between (1 - pct) and (1 + pct)
 */
function randomVariance(baseValue: number, variancePct: number): number {
  const variance = (Math.random() * 2 - 1) * variancePct;
  return baseValue * (1 + variance);
}

/**
 * Calculate age modifier for growth
 */
function calculateAgeModifier(age: number): number {
  if (age < GROWTH_CONFIG.AGE_YOUNG_THRESHOLD) {
    return GROWTH_CONFIG.AGE_YOUNG_MODIFIER;
  } else if (age > GROWTH_CONFIG.AGE_OLD_THRESHOLD) {
    return GROWTH_CONFIG.AGE_OLD_MODIFIER;
  }
  return GROWTH_CONFIG.AGE_NORMAL_MODIFIER;
}

/**
 * Calculate coaching quality modifier
 * Based on average of hitting, pitching, and development coordinator skills
 * Range: -3 to +3 based on 20-80 skill scale
 */
function calculateCoachingModifier(
  hittingCoachSkill: number,
  pitchingCoachSkill: number,
  developmentCoordSkill: number,
  playerType: 'HITTER' | 'PITCHER'
): number {
  // Weight relevant coach more heavily
  let avgSkill: number;
  if (playerType === 'HITTER') {
    avgSkill = (hittingCoachSkill * 0.5 + developmentCoordSkill * 0.5);
  } else {
    avgSkill = (pitchingCoachSkill * 0.5 + developmentCoordSkill * 0.5);
  }

  // Map 20-80 skill to -3 to +3 modifier
  // 20 skill = -3, 50 skill = 0, 80 skill = +3
  return ((avgSkill - 50) / 30) * GROWTH_CONFIG.COACHING_MODIFIER_RANGE;
}

/**
 * Calculate playing time modifier
 * Based on games played relative to expected
 * Range: -1.5 to +1.5
 */
function calculatePlayingTimeModifier(
  gamesPlayed: number,
  expectedGames: number = 140
): number {
  if (expectedGames === 0) return 0;

  const playingTimePct = gamesPlayed / expectedGames;

  // Full playing time = +1.5, no playing time = -1.5
  // 50% playing time = 0
  return (playingTimePct - 0.5) * 2 * GROWTH_CONFIG.PLAYING_TIME_MODIFIER_RANGE;
}

/**
 * Calculate tier appropriateness modifier
 * Player should be at appropriate tier for their rating
 * Range: -2 to +2
 */
function calculateTierAppropriatenessModifier(
  currentRating: number,
  playerTier: Tier,
  tierConfigs: typeof TIER_CONFIGS
): number {
  const tierConfig = tierConfigs[playerTier];
  const tierMidpoint = (tierConfig.ratingRange.min + tierConfig.ratingRange.max) / 2;

  // If player is within ideal range, positive modifier
  if (currentRating >= tierConfig.ratingRange.min &&
      currentRating <= tierConfig.ratingRange.max) {
    // Bonus for being in the sweet spot (within 10 points of midpoint)
    const distanceFromMidpoint = Math.abs(currentRating - tierMidpoint);
    if (distanceFromMidpoint <= 10) {
      return GROWTH_CONFIG.TIER_APPROPRIATENESS_RANGE;
    }
    return GROWTH_CONFIG.TIER_APPROPRIATENESS_RANGE * 0.5;
  }

  // If player rating is below tier minimum (promoted too early)
  if (currentRating < tierConfig.ratingRange.min) {
    const gapSize = tierConfig.ratingRange.min - currentRating;
    // Worse penalty for bigger gaps
    return -GROWTH_CONFIG.TIER_APPROPRIATENESS_RANGE * Math.min(1, gapSize / 10);
  }

  // If player rating is above tier maximum (held back too long)
  if (currentRating > tierConfig.ratingRange.max) {
    const gapSize = currentRating - tierConfig.ratingRange.max;
    // Mild penalty for being held back
    return -GROWTH_CONFIG.TIER_APPROPRIATENESS_RANGE * 0.5 * Math.min(1, gapSize / 10);
  }

  return 0;
}

// ============================================
// MAIN GROWTH CALCULATION
// ============================================

export interface PlayerGrowthInput {
  player: Player;
  hittingCoachSkill: number;
  pitchingCoachSkill: number;
  developmentCoordSkill: number;
  gamesPlayedThisSeason: number;
  expectedGames?: number;
  tierConfigs: typeof TIER_CONFIGS;
}

/**
 * Calculate player growth for a single season
 *
 * Formula from PRD:
 * Annual Rating Growth =
 *   Base Growth (potential - current) × 0.15
 *   + Age Modifier (1.2 if <24, 0.7 if >28)
 *   + Coaching Quality (±3)
 *   + Playing Time (±1.5)
 *   + Tier Appropriateness (±2)
 *   + Work Ethic (±2)
 *   + Injury Impact (-3 if injured)
 *   + Random Variance (±20%)
 *
 * Clamped to: -5 to +5 per year
 */
export function calculatePlayerGrowth(input: PlayerGrowthInput): PlayerGrowthResult {
  const {
    player,
    hittingCoachSkill,
    pitchingCoachSkill,
    developmentCoordSkill,
    gamesPlayedThisSeason,
    expectedGames = 140,
    tierConfigs,
  } = input;

  // 1. Base Growth: (potential - current) × 0.15
  const baseGrowth = (player.potential - player.currentRating) * GROWTH_CONFIG.BASE_GROWTH_MULTIPLIER;

  // 2. Age Modifier
  const ageModifier = calculateAgeModifier(player.age);

  // 3. Coaching Quality Modifier
  const coachingModifier = calculateCoachingModifier(
    hittingCoachSkill,
    pitchingCoachSkill,
    developmentCoordSkill,
    player.playerType
  );

  // 4. Playing Time Modifier
  const playingTimeModifier = calculatePlayingTimeModifier(
    gamesPlayedThisSeason,
    expectedGames
  );

  // 5. Tier Appropriateness Modifier
  const tierAppropriatenessModifier = calculateTierAppropriatenessModifier(
    player.currentRating,
    player.tier,
    tierConfigs
  );

  // 6. Work Ethic Modifier
  const workEthicModifier = WORK_ETHIC_MODIFIERS[player.hiddenTraits.workEthic];

  // 7. Injury Impact
  const injuryModifier = player.isInjured ? GROWTH_CONFIG.INJURY_PENALTY : 0;

  // Sum all components before variance
  const sumBeforeVariance =
    (baseGrowth * ageModifier) +
    coachingModifier +
    playingTimeModifier +
    tierAppropriatenessModifier +
    workEthicModifier +
    injuryModifier;

  // 8. Apply Random Variance (±20%)
  const growthWithVariance = randomVariance(
    Math.abs(sumBeforeVariance),
    GROWTH_CONFIG.RANDOM_VARIANCE_PCT
  ) * Math.sign(sumBeforeVariance);

  // 9. Clamp to -5 to +5
  const clampedGrowth = clamp(
    growthWithVariance,
    GROWTH_CONFIG.MIN_GROWTH,
    GROWTH_CONFIG.MAX_GROWTH
  );

  // Calculate new rating (clamped to 20-80)
  const newRating = clamp(
    Math.round(player.currentRating + clampedGrowth),
    GROWTH_CONFIG.MIN_RATING,
    GROWTH_CONFIG.MAX_RATING
  );

  return {
    playerId: player.id,
    previousRating: player.currentRating,
    newRating,
    ratingChange: newRating - player.currentRating,

    // Breakdown for debugging/display
    baseGrowth,
    ageModifier,
    coachingModifier,
    playingTimeModifier,
    tierAppropriatenessModifier,
    workEthicModifier,
    injuryModifier,
    randomVariance: clampedGrowth - sumBeforeVariance,
  };
}

/**
 * Calculate growth for all players on a roster
 */
export function calculateRosterGrowth(
  players: Player[],
  hittingCoachSkill: number,
  pitchingCoachSkill: number,
  developmentCoordSkill: number,
  tierConfigs: typeof TIER_CONFIGS
): PlayerGrowthResult[] {
  return players.map(player =>
    calculatePlayerGrowth({
      player,
      hittingCoachSkill,
      pitchingCoachSkill,
      developmentCoordSkill,
      gamesPlayedThisSeason: player.gamesPlayed,
      tierConfigs,
    })
  );
}

// ============================================
// PROMOTION READINESS CHECK
// ============================================

export interface PromotionReadiness {
  isReady: boolean;
  reasons: string[];
  risks: string[];
}

/**
 * Check if a player is ready for promotion to next tier
 *
 * From PRD:
 * Ready if:
 *   trueRating >= tierMinimum + 10
 *   AND yearsAtTier >= 1
 *   AND morale > 40
 *   AND (stats show improvement OR age > 23)
 */
export function checkPromotionReadiness(
  player: Player,
  nextTier: Tier,
  tierConfigs: typeof TIER_CONFIGS,
  previousYearRating?: number
): PromotionReadiness {
  const reasons: string[] = [];
  const risks: string[] = [];

  const nextTierConfig = tierConfigs[nextTier];
  const ratingThreshold = nextTierConfig.ratingRange.min + 10;

  // Check rating
  const ratingReady = player.currentRating >= ratingThreshold;
  if (ratingReady) {
    reasons.push(`Rating (${player.currentRating}) meets threshold (${ratingThreshold})`);
  } else {
    risks.push(`Rating (${player.currentRating}) below threshold (${ratingThreshold})`);
  }

  // Check years at tier
  const timeReady = player.yearsAtTier >= 1;
  if (timeReady) {
    reasons.push(`Has spent ${player.yearsAtTier} year(s) at current tier`);
  } else {
    risks.push('Has not spent a full year at current tier');
  }

  // Check morale
  const moraleReady = player.morale > 40;
  if (moraleReady) {
    reasons.push(`Morale (${player.morale}) is healthy`);
  } else {
    risks.push(`Low morale (${player.morale}) may affect performance`);
  }

  // Check improvement or age
  const hasImproved = previousYearRating ? player.currentRating > previousYearRating : false;
  const isOlderPlayer = player.age > 23;
  const progressReady = hasImproved || isOlderPlayer;

  if (hasImproved) {
    reasons.push('Showed improvement this season');
  } else if (isOlderPlayer) {
    reasons.push(`Age (${player.age}) indicates readiness`);
  } else {
    risks.push('No clear improvement and still young');
  }

  const isReady = ratingReady && timeReady && moraleReady && progressReady;

  return { isReady, reasons, risks };
}

// ============================================
// PROMOTION/DEMOTION EFFECTS
// ============================================

export interface PromotionEffects {
  confidenceChange: number;
  moraleChange: number;
  potentialChange: number;
}

/**
 * Calculate effects of promoting a player too early
 *
 * From PRD:
 * - Confidence: -20
 * - Potential: -5 (permanent ceiling damage)
 * - Growth Rate: -2/year (stunted development)
 * - Morale: -20
 */
export function calculateEarlyPromotionEffects(): PromotionEffects {
  return {
    confidenceChange: -20,
    moraleChange: -20,
    potentialChange: -5, // Permanent damage!
  };
}

/**
 * Calculate effects of promoting a player too late
 *
 * From PRD:
 * - Morale: -20
 * - Trade Value: -10%
 * - Risk of departure: +10%
 */
export function calculateLatePromotionEffects(): PromotionEffects {
  return {
    confidenceChange: -10,
    moraleChange: -20,
    potentialChange: 0, // No permanent damage
  };
}

/**
 * Calculate effects of promoting at the right time
 */
export function calculateIdealPromotionEffects(): PromotionEffects {
  return {
    confidenceChange: 10,
    moraleChange: 15,
    potentialChange: 0,
  };
}

// ============================================
// INJURY SIMULATION
// ============================================

export interface InjuryResult {
  isInjured: boolean;
  gamesLost: number;
}

/**
 * Simulate potential injury for a player
 *
 * From PRD:
 * - 20% chance if injury prone
 * - Costs 30-60 games/season
 */
export function simulateInjury(player: Player): InjuryResult {
  if (!player.hiddenTraits.injuryProne) {
    return { isInjured: false, gamesLost: 0 };
  }

  // 20% chance of injury
  const isInjured = Math.random() < 0.20;

  if (!isInjured) {
    return { isInjured: false, gamesLost: 0 };
  }

  // 30-60 games lost
  const gamesLost = Math.floor(Math.random() * 31) + 30;

  return { isInjured, gamesLost };
}

// ============================================
// AGE PROGRESSION
// ============================================

/**
 * Age a player by one year and apply any age-related effects
 */
export function agePlayer(player: Player): {
  newAge: number;
  isRetiring: boolean;
  declineModifier: number;
} {
  const newAge = player.age + 1;

  // Check for retirement (players over 35 have increasing chance)
  let isRetiring = false;
  if (newAge > 35) {
    const retirementChance = (newAge - 35) * 0.15; // 15% per year over 35
    isRetiring = Math.random() < retirementChance;
  }

  // Calculate decline modifier for older players
  let declineModifier = 0;
  if (newAge > 32) {
    // Gradual decline starting at 33
    declineModifier = -(newAge - 32) * 0.5;
  }

  return { newAge, isRetiring, declineModifier };
}
