// ============================================
// Player Training & Development System
// Processes daily training and XP accumulation
// ============================================

import type {
  Player,
  TrainingFocus,
  HitterTrainingFocus,
  PitcherTrainingFocus,
  HitterAttributes,
  PitcherAttributes,
  DistrictBonuses,
  WorkEthic,
  FacilityLevel,
} from '@/lib/types';
import { FACILITY_CONFIGS } from '@/lib/types';

// ============================================
// CONFIGURATION
// ============================================

export const TRAINING_CONFIG = {
  // Base XP per training session (affected by multipliers)
  BASE_XP_PER_DAY: 2,

  // Age-based XP multipliers
  AGE_MULTIPLIERS: {
    YOUNG: { maxAge: 21, multiplier: 1.5 },     // Under 22
    PRIME_DEV: { maxAge: 25, multiplier: 1.2 }, // 22-25
    PRIME: { maxAge: 28, multiplier: 1.0 },     // 26-28
    DECLINING: { maxAge: 99, multiplier: 0.6 }, // 29+
  },

  // Work ethic multipliers
  WORK_ETHIC_MULTIPLIERS: {
    poor: 0.6,
    average: 1.0,
    excellent: 1.4,
  } as Record<WorkEthic, number>,

  // Facility level bonuses
  FACILITY_MULTIPLIERS: {
    0: 1.0,   // Basic Dugout
    1: 1.15,  // Minor League Complex
    2: 1.30,  // Player Development Lab
  } as Record<FacilityLevel, number>,

  // Morale affects training effectiveness
  MORALE_THRESHOLDS: {
    LOW: { max: 30, multiplier: 0.7 },
    MEDIUM: { max: 60, multiplier: 1.0 },
    HIGH: { max: 100, multiplier: 1.2 },
  },

  // Injured players gain reduced XP
  INJURED_MULTIPLIER: 0.25,

  // Reserve players (not on active roster) gain less XP
  RESERVE_MULTIPLIER: 0.7,

  // Max rating increase from training per season
  MAX_RATING_GAIN_PER_SEASON: 5,

  // Attribute improvement distribution for "overall" focus
  OVERALL_FOCUS_SPLITS: {
    HITTER: ['hit', 'power', 'speed', 'field', 'arm'] as HitterTrainingFocus[],
    PITCHER: ['stuff', 'control', 'movement'] as PitcherTrainingFocus[],
  },
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Calculate progression rate based on age and potential
 * Young + High Potential = Fast Growth
 */
export function calculateProgressionRate(
  age: number,
  potential: number,
  currentRating: number
): number {
  // Age factor: Younger = faster
  let ageFactor: number;
  if (age <= 21) ageFactor = 1.5;
  else if (age <= 25) ageFactor = 1.2;
  else if (age <= 28) ageFactor = 1.0;
  else ageFactor = 0.7;

  // Potential factor: Higher potential = faster
  let potentialFactor: number;
  if (potential >= 70) potentialFactor = 1.3;
  else if (potential >= 60) potentialFactor = 1.1;
  else if (potential >= 50) potentialFactor = 1.0;
  else potentialFactor = 0.8;

  // Ceiling factor: Harder when close to potential
  const gap = potential - currentRating;
  let ceilingFactor: number;
  if (gap >= 15) ceilingFactor = 1.2;
  else if (gap >= 10) ceilingFactor = 1.0;
  else if (gap >= 5) ceilingFactor = 0.8;
  else ceilingFactor = 0.5;

  // Combine factors (clamped to 0.5-2.0)
  return Math.max(0.5, Math.min(2.0, ageFactor * potentialFactor * ceilingFactor));
}

/**
 * Get age-based XP multiplier
 */
function getAgeMultiplier(age: number): number {
  const { AGE_MULTIPLIERS } = TRAINING_CONFIG;
  if (age <= AGE_MULTIPLIERS.YOUNG.maxAge) return AGE_MULTIPLIERS.YOUNG.multiplier;
  if (age <= AGE_MULTIPLIERS.PRIME_DEV.maxAge) return AGE_MULTIPLIERS.PRIME_DEV.multiplier;
  if (age <= AGE_MULTIPLIERS.PRIME.maxAge) return AGE_MULTIPLIERS.PRIME.multiplier;
  return AGE_MULTIPLIERS.DECLINING.multiplier;
}

/**
 * Get morale-based XP multiplier
 */
function getMoraleMultiplier(morale: number): number {
  const { MORALE_THRESHOLDS } = TRAINING_CONFIG;
  if (morale <= MORALE_THRESHOLDS.LOW.max) return MORALE_THRESHOLDS.LOW.multiplier;
  if (morale <= MORALE_THRESHOLDS.MEDIUM.max) return MORALE_THRESHOLDS.MEDIUM.multiplier;
  return MORALE_THRESHOLDS.HIGH.multiplier;
}

// ============================================
// TRAINING RESULT TYPES
// ============================================

export interface TrainingResult {
  playerId: string;
  previousXp: number;
  newXp: number;
  xpGained: number;
  leveledUp: boolean;
  attributeImproved?: string;
  previousRating?: number;
  newRating?: number;
}

export interface BatchTrainingResult {
  trainedPlayers: TrainingResult[];
  totalXpGained: number;
  playersLeveledUp: number;
}

// ============================================
// SINGLE PLAYER TRAINING
// ============================================

/**
 * Process a single training session for a player
 */
export function processPlayerTraining(
  player: {
    id: string;
    age: number;
    potential: number;
    currentRating: number;
    playerType: 'HITTER' | 'PITCHER';
    trainingFocus: TrainingFocus;
    currentXp: number;
    progressionRate: number;
    morale: number;
    isInjured: boolean;
    rosterStatus: 'ACTIVE' | 'RESERVE';
    hitterAttributes: HitterAttributes | null;
    pitcherAttributes: PitcherAttributes | null;
    hiddenTraits: { workEthic: WorkEthic };
  },
  districtBonuses: DistrictBonuses,
  facilityLevel: FacilityLevel,
  gamesSimulated: number = 1 // Number of games to simulate training for
): TrainingResult {
  const result: TrainingResult = {
    playerId: player.id,
    previousXp: player.currentXp,
    newXp: player.currentXp,
    xpGained: 0,
    leveledUp: false,
  };

  // Calculate XP per game (roughly 1 training day per game)
  const baseXp = TRAINING_CONFIG.BASE_XP_PER_DAY * gamesSimulated;

  // Apply multipliers
  const ageMultiplier = getAgeMultiplier(player.age);
  const cityBonusMultiplier = districtBonuses.trainingMult; // Performance District bonus
  const facilityMultiplier = TRAINING_CONFIG.FACILITY_MULTIPLIERS[facilityLevel];
  const moraleMultiplier = getMoraleMultiplier(player.morale);
  const workEthicMultiplier = TRAINING_CONFIG.WORK_ETHIC_MULTIPLIERS[player.hiddenTraits.workEthic];
  const injuredMultiplier = player.isInjured ? TRAINING_CONFIG.INJURED_MULTIPLIER : 1.0;
  const rosterMultiplier = player.rosterStatus === 'RESERVE' ? TRAINING_CONFIG.RESERVE_MULTIPLIER : 1.0;

  // Combine all multipliers with progression rate
  const totalMultiplier =
    player.progressionRate *
    ageMultiplier *
    cityBonusMultiplier *
    facilityMultiplier *
    moraleMultiplier *
    workEthicMultiplier *
    injuredMultiplier *
    rosterMultiplier;

  // Calculate final XP gained (with some randomness)
  const variance = 0.8 + Math.random() * 0.4; // 0.8x to 1.2x
  const xpGained = Math.round(baseXp * totalMultiplier * variance);

  result.xpGained = xpGained;
  result.newXp = Math.min(100, player.currentXp + xpGained);

  // Check for level up
  if (result.newXp >= 100) {
    result.leveledUp = true;
    result.newXp = result.newXp - 100; // Carry over excess XP

    // Determine which attribute to improve
    const attributeToImprove = getAttributeToImprove(player);
    if (attributeToImprove) {
      result.attributeImproved = attributeToImprove.attribute;
      result.previousRating = attributeToImprove.previousValue;
      result.newRating = Math.min(80, attributeToImprove.previousValue + 1);
    }
  }

  return result;
}

/**
 * Determine which attribute to improve based on training focus
 */
function getAttributeToImprove(player: {
  playerType: 'HITTER' | 'PITCHER';
  trainingFocus: TrainingFocus;
  potential: number;
  hitterAttributes: HitterAttributes | null;
  pitcherAttributes: PitcherAttributes | null;
}): { attribute: string; previousValue: number } | null {
  const { trainingFocus, playerType, hitterAttributes, pitcherAttributes, potential } = player;

  if (playerType === 'HITTER' && hitterAttributes) {
    if (trainingFocus === 'overall') {
      // Pick the attribute with most room to grow (furthest from potential)
      const attributes = TRAINING_CONFIG.OVERALL_FOCUS_SPLITS.HITTER;
      let bestAttr = attributes[0];
      let maxRoom = potential - hitterAttributes[bestAttr];

      for (const attr of attributes) {
        const room = potential - hitterAttributes[attr];
        if (room > maxRoom) {
          maxRoom = room;
          bestAttr = attr;
        }
      }

      return { attribute: bestAttr, previousValue: hitterAttributes[bestAttr] };
    } else if (trainingFocus in hitterAttributes) {
      const attr = trainingFocus as HitterTrainingFocus;
      return { attribute: attr, previousValue: hitterAttributes[attr] };
    }
  } else if (playerType === 'PITCHER' && pitcherAttributes) {
    if (trainingFocus === 'overall') {
      // Pick the attribute with most room to grow
      const attributes = TRAINING_CONFIG.OVERALL_FOCUS_SPLITS.PITCHER;
      let bestAttr = attributes[0];
      let maxRoom = potential - pitcherAttributes[bestAttr];

      for (const attr of attributes) {
        const room = potential - pitcherAttributes[attr];
        if (room > maxRoom) {
          maxRoom = room;
          bestAttr = attr;
        }
      }

      return { attribute: bestAttr, previousValue: pitcherAttributes[bestAttr] };
    } else if (trainingFocus in pitcherAttributes) {
      const attr = trainingFocus as PitcherTrainingFocus;
      return { attribute: attr, previousValue: pitcherAttributes[attr] };
    }
  }

  return null;
}

// ============================================
// BATCH TRAINING (For Season Simulation)
// ============================================

/**
 * Process training for all players in a batch
 * Called during season simulation
 */
export function processBatchTraining(
  players: Array<{
    id: string;
    age: number;
    potential: number;
    currentRating: number;
    playerType: 'HITTER' | 'PITCHER';
    trainingFocus: TrainingFocus;
    currentXp: number;
    progressionRate: number;
    morale: number;
    isInjured: boolean;
    rosterStatus: 'ACTIVE' | 'RESERVE';
    hitterAttributes: HitterAttributes | null;
    pitcherAttributes: PitcherAttributes | null;
    hiddenTraits: { workEthic: WorkEthic };
  }>,
  districtBonuses: DistrictBonuses,
  facilityLevel: FacilityLevel,
  gamesSimulated: number
): BatchTrainingResult {
  const results: TrainingResult[] = [];
  let totalXpGained = 0;
  let playersLeveledUp = 0;

  for (const player of players) {
    const result = processPlayerTraining(
      player,
      districtBonuses,
      facilityLevel,
      gamesSimulated
    );

    results.push(result);
    totalXpGained += result.xpGained;
    if (result.leveledUp) playersLeveledUp++;
  }

  return {
    trainedPlayers: results,
    totalXpGained,
    playersLeveledUp,
  };
}

// ============================================
// TRAINING FOCUS RECOMMENDATIONS
// ============================================

/**
 * Get recommended training focus based on player attributes
 * Suggests training the weakest attribute that's still far from potential
 */
export function getRecommendedTrainingFocus(player: {
  playerType: 'HITTER' | 'PITCHER';
  potential: number;
  hitterAttributes: HitterAttributes | null;
  pitcherAttributes: PitcherAttributes | null;
}): TrainingFocus {
  const { playerType, potential, hitterAttributes, pitcherAttributes } = player;

  if (playerType === 'HITTER' && hitterAttributes) {
    const attributes = TRAINING_CONFIG.OVERALL_FOCUS_SPLITS.HITTER;
    let bestFocus: HitterTrainingFocus = 'hit';
    let bestScore = -Infinity;

    for (const attr of attributes) {
      const value = hitterAttributes[attr];
      const room = potential - value; // How much room to grow
      // Score: Prioritize attributes with most room to grow AND low current value
      const score = room * (100 - value) / 100;

      if (score > bestScore && room > 5) {
        bestScore = score;
        bestFocus = attr;
      }
    }

    return bestFocus;
  } else if (playerType === 'PITCHER' && pitcherAttributes) {
    const attributes = TRAINING_CONFIG.OVERALL_FOCUS_SPLITS.PITCHER;
    let bestFocus: PitcherTrainingFocus = 'stuff';
    let bestScore = -Infinity;

    for (const attr of attributes) {
      const value = pitcherAttributes[attr];
      const room = potential - value;
      const score = room * (100 - value) / 100;

      if (score > bestScore && room > 5) {
        bestScore = score;
        bestFocus = attr;
      }
    }

    return bestFocus;
  }

  return 'overall';
}

// ============================================
// TRAINING SUMMARY
// ============================================

export interface TrainingSummary {
  trainingMult: number;
  facilityBonus: number;
  totalBonus: number;
  avgProgressionRate: number;
  estimatedXpPerGame: number;
  estimatedGamesToLevelUp: number;
}

/**
 * Calculate training summary for UI display
 */
export function calculateTrainingSummary(
  players: Array<{
    progressionRate: number;
    morale: number;
    hiddenTraits: { workEthic: WorkEthic };
  }>,
  districtBonuses: DistrictBonuses,
  facilityLevel: FacilityLevel
): TrainingSummary {
  const trainingMult = districtBonuses.trainingMult;
  const facilityBonus = TRAINING_CONFIG.FACILITY_MULTIPLIERS[facilityLevel];
  const totalBonus = trainingMult * facilityBonus;

  // Calculate average progression rate
  const avgProgressionRate = players.length > 0
    ? players.reduce((sum, p) => sum + p.progressionRate, 0) / players.length
    : 1.0;

  // Estimate XP per game for an average player
  const avgMorale = players.length > 0
    ? players.reduce((sum, p) => sum + p.morale, 0) / players.length
    : 50;
  const moraleMultiplier = getMoraleMultiplier(avgMorale);

  const estimatedXpPerGame = Math.round(
    TRAINING_CONFIG.BASE_XP_PER_DAY * avgProgressionRate * totalBonus * moraleMultiplier
  );

  // Estimate games to level up (from 0 XP)
  const estimatedGamesToLevelUp = estimatedXpPerGame > 0
    ? Math.ceil(100 / estimatedXpPerGame)
    : 999;

  return {
    trainingMult,
    facilityBonus,
    totalBonus,
    avgProgressionRate,
    estimatedXpPerGame,
    estimatedGamesToLevelUp,
  };
}
