// ============================================
// Game Progression System
// Handles tier promotion and bankruptcy logic
// ============================================

import { TIER_CONFIGS, type Tier } from '@/lib/types';

// ============================================
// TYPES
// ============================================

export interface PromotionCheckInput {
  currentTier: Tier;
  winPct: number;
  reserves: number;
  cityPride: number;
  consecutiveWinningSeasons: number;
  wonDivision: boolean;
  wonChampionship: boolean;
}

export interface PromotionEligibility {
  isEligible: boolean;
  nextTier: Tier | null;
  metCriteria: string[];
  missingCriteria: string[];
  requirements: {
    winPct: { required: number; actual: number; met: boolean };
    reserves: { required: number; actual: number; met: boolean };
    cityPride: { required: number; actual: number; met: boolean };
    consecutiveYears: { required: number; actual: number; met: boolean };
    divisionTitle?: { required: boolean; actual: boolean; met: boolean };
    leagueChampionship?: { required: boolean; actual: boolean; met: boolean };
  };
}

export interface GameStatusCheck {
  status: 'active' | 'game_over' | 'promoted' | 'champion';
  reason: string | null;
  details: {
    totalDebt: number;
    debtThreshold: number;
    isInDebt: boolean;
    isBankrupt: boolean;
  };
}

export type GameStatus = 'active' | 'game_over' | 'promoted' | 'champion';

// ============================================
// TIER ORDER (for promotion lookup)
// ============================================

const TIER_ORDER: Tier[] = ['LOW_A', 'HIGH_A', 'DOUBLE_A', 'TRIPLE_A', 'MLB'];

function getNextTier(currentTier: Tier): Tier | null {
  const currentIndex = TIER_ORDER.indexOf(currentTier);
  if (currentIndex === -1 || currentIndex >= TIER_ORDER.length - 1) {
    return null; // Already at MLB or invalid tier
  }
  return TIER_ORDER[currentIndex + 1];
}

function getTierIndex(tier: Tier): number {
  return TIER_ORDER.indexOf(tier);
}

// ============================================
// PROMOTION ELIGIBILITY CHECK
// ============================================

/**
 * Check if a team is eligible for promotion to the next tier.
 *
 * Each tier has specific requirements:
 * - LOW_A -> HIGH_A: Win% > .550, Reserves > $50K, Pride > 50, 2 consecutive years
 * - HIGH_A -> DOUBLE_A: Win% > .575, Reserves > $200K, Pride > 60, Division Title, 2 years
 * - DOUBLE_A -> TRIPLE_A: Win% > .600, Reserves > $500K, Pride > 70, Division Title, 2 years
 * - TRIPLE_A -> MLB: Win% > .625, Reserves > $2M, Pride > 80, Championship, 3 years
 *
 * MLB is the top tier - no promotion possible.
 */
export function checkPromotionEligibility(input: PromotionCheckInput): PromotionEligibility {
  const {
    currentTier,
    winPct,
    reserves,
    cityPride,
    consecutiveWinningSeasons,
    wonDivision,
    wonChampionship,
  } = input;

  const nextTier = getNextTier(currentTier);
  const config = TIER_CONFIGS[currentTier];
  const requirements = config.promotionRequirements;

  // MLB is the top tier - no promotion possible
  if (!nextTier || !requirements) {
    return {
      isEligible: false,
      nextTier: null,
      metCriteria: [],
      missingCriteria: ['Already at top tier (MLB)'],
      requirements: {
        winPct: { required: 0, actual: winPct, met: true },
        reserves: { required: 0, actual: reserves, met: true },
        cityPride: { required: 0, actual: cityPride, met: true },
        consecutiveYears: { required: 0, actual: consecutiveWinningSeasons, met: true },
      },
    };
  }

  const metCriteria: string[] = [];
  const missingCriteria: string[] = [];

  // Check win percentage
  const winPctMet = winPct >= requirements.winPct;
  if (winPctMet) {
    metCriteria.push(`Win% ${(winPct * 100).toFixed(1)}% >= ${(requirements.winPct * 100).toFixed(1)}%`);
  } else {
    missingCriteria.push(`Win% ${(winPct * 100).toFixed(1)}% < ${(requirements.winPct * 100).toFixed(1)}% required`);
  }

  // Check reserves
  const reservesMet = reserves >= requirements.reserves;
  if (reservesMet) {
    metCriteria.push(`Reserves $${(reserves / 1000).toFixed(0)}K >= $${(requirements.reserves / 1000).toFixed(0)}K`);
  } else {
    missingCriteria.push(`Reserves $${(reserves / 1000).toFixed(0)}K < $${(requirements.reserves / 1000).toFixed(0)}K required`);
  }

  // Check city pride
  const prideMet = cityPride >= requirements.cityPride;
  if (prideMet) {
    metCriteria.push(`City Pride ${cityPride} >= ${requirements.cityPride}`);
  } else {
    missingCriteria.push(`City Pride ${cityPride} < ${requirements.cityPride} required`);
  }

  // Check consecutive winning seasons
  const yearsMet = consecutiveWinningSeasons >= requirements.consecutiveYears;
  if (yearsMet) {
    metCriteria.push(`${consecutiveWinningSeasons} consecutive winning seasons >= ${requirements.consecutiveYears}`);
  } else {
    missingCriteria.push(`${consecutiveWinningSeasons} consecutive winning seasons < ${requirements.consecutiveYears} required`);
  }

  // Check division title (if required)
  let divisionMet = true;
  if (requirements.divisionTitle) {
    divisionMet = wonDivision;
    if (divisionMet) {
      metCriteria.push('Won Division Title');
    } else {
      missingCriteria.push('Division Title required');
    }
  }

  // Check league championship (if required)
  let championshipMet = true;
  if (requirements.leagueChampionship) {
    championshipMet = wonChampionship;
    if (championshipMet) {
      metCriteria.push('Won League Championship');
    } else {
      missingCriteria.push('League Championship required');
    }
  }

  const isEligible = winPctMet && reservesMet && prideMet && yearsMet && divisionMet && championshipMet;

  return {
    isEligible,
    nextTier,
    metCriteria,
    missingCriteria,
    requirements: {
      winPct: { required: requirements.winPct, actual: winPct, met: winPctMet },
      reserves: { required: requirements.reserves, actual: reserves, met: reservesMet },
      cityPride: { required: requirements.cityPride, actual: cityPride, met: prideMet },
      consecutiveYears: { required: requirements.consecutiveYears, actual: consecutiveWinningSeasons, met: yearsMet },
      ...(requirements.divisionTitle && {
        divisionTitle: { required: true, actual: wonDivision, met: divisionMet },
      }),
      ...(requirements.leagueChampionship && {
        leagueChampionship: { required: true, actual: wonChampionship, met: championshipMet },
      }),
    },
  };
}

// ============================================
// BANKRUPTCY / GAME STATUS CHECK
// ============================================

/**
 * Check the game status for bankruptcy or other end conditions.
 *
 * Bankruptcy occurs when:
 * - Total debt exceeds 2x the annual budget
 *
 * Debt is calculated as negative reserves (e.g., reserves of -$500K = $500K debt)
 */
export function checkGameStatus(
  reserves: number,
  annualBudget: number,
  currentTier: Tier
): GameStatusCheck {
  // Calculate debt (debt is negative reserves)
  const totalDebt = reserves < 0 ? Math.abs(reserves) : 0;
  const isInDebt = reserves < 0;

  // Bankruptcy threshold is 2x annual budget
  const debtThreshold = annualBudget * 2;
  const isBankrupt = totalDebt > debtThreshold;

  if (isBankrupt) {
    return {
      status: 'game_over',
      reason: `Bankruptcy: Debt of $${(totalDebt / 1000).toFixed(0)}K exceeds threshold of $${(debtThreshold / 1000).toFixed(0)}K`,
      details: {
        totalDebt,
        debtThreshold,
        isInDebt,
        isBankrupt,
      },
    };
  }

  // Check if at MLB and won championship (ultimate victory)
  // This would need championship data passed in - for now just return active

  return {
    status: 'active',
    reason: null,
    details: {
      totalDebt,
      debtThreshold,
      isInDebt,
      isBankrupt,
    },
  };
}

// ============================================
// PROMOTION EXECUTION
// ============================================

export interface PromotionResult {
  success: boolean;
  previousTier: Tier;
  newTier: Tier;
  bonuses: {
    budgetIncrease: number;
    stadiumCapacityIncrease: number;
    prideBoost: number;
  };
}

/**
 * Calculate the bonuses and changes when promoting to a new tier.
 */
export function calculatePromotionBonuses(
  previousTier: Tier,
  newTier: Tier
): PromotionResult['bonuses'] {
  const previousConfig = TIER_CONFIGS[previousTier];
  const newConfig = TIER_CONFIGS[newTier];

  return {
    budgetIncrease: newConfig.budget - previousConfig.budget,
    stadiumCapacityIncrease: newConfig.stadiumCapacity - previousConfig.stadiumCapacity,
    prideBoost: 15, // Flat pride boost for promotion
  };
}

// ============================================
// DEBT WARNING LEVELS
// ============================================

export interface DebtWarning {
  level: 'none' | 'low' | 'medium' | 'high' | 'critical';
  message: string | null;
  debtPercent: number;
}

/**
 * Get debt warning level for UI display.
 */
export function getDebtWarning(reserves: number, annualBudget: number): DebtWarning {
  if (reserves >= 0) {
    return { level: 'none', message: null, debtPercent: 0 };
  }

  const debt = Math.abs(reserves);
  const debtPercent = (debt / annualBudget) * 100;
  const threshold = annualBudget * 2; // Bankruptcy threshold

  if (debt >= threshold) {
    return {
      level: 'critical',
      message: 'BANKRUPTCY IMMINENT! Debt exceeds maximum threshold.',
      debtPercent,
    };
  }

  if (debt >= threshold * 0.75) {
    return {
      level: 'high',
      message: 'Severe debt crisis. Cut costs immediately or face bankruptcy.',
      debtPercent,
    };
  }

  if (debt >= threshold * 0.5) {
    return {
      level: 'medium',
      message: 'Significant debt. Financial restructuring recommended.',
      debtPercent,
    };
  }

  if (debt >= threshold * 0.25) {
    return {
      level: 'low',
      message: 'Minor debt. Monitor spending carefully.',
      debtPercent,
    };
  }

  return {
    level: 'low',
    message: 'Operating in debt. Work to return to positive reserves.',
    debtPercent,
  };
}

// ============================================
// TIER DISPLAY HELPERS
// ============================================

export function getTierDisplayName(tier: Tier): string {
  return TIER_CONFIGS[tier].name;
}

export function getTierLevel(tier: Tier): number {
  return getTierIndex(tier) + 1; // 1-5 instead of 0-4
}

export function isTopTier(tier: Tier): boolean {
  return tier === 'MLB';
}

export function getProgressToNextTier(
  currentTier: Tier,
  input: PromotionCheckInput
): number {
  const eligibility = checkPromotionEligibility(input);
  if (!eligibility.nextTier) return 100; // Already at top

  const totalCriteria = eligibility.metCriteria.length + eligibility.missingCriteria.length;
  if (totalCriteria === 0) return 0;

  return Math.round((eligibility.metCriteria.length / totalCriteria) * 100);
}
