/**
 * Contract & Free Agency System
 *
 * Handles salary calculations, contract generation, and free agency logic.
 */

import { Player, Tier, TIER_CONFIGS } from '@/lib/types';

// ============================================
// CONTRACT CONFIGURATION
// ============================================

// Contract length based on player rating
export const CONTRACT_LENGTH_TIERS = {
  elite: { minRating: 70, years: { min: 4, max: 6 } },      // Star players get longer deals
  good: { minRating: 55, years: { min: 2, max: 4 } },       // Good players get medium deals
  average: { minRating: 40, years: { min: 1, max: 2 } },    // Average get short deals
  replacement: { minRating: 0, years: { min: 1, max: 1 } }, // Low-level get 1 year
};

// Morale thresholds for re-signing
export const MORALE_THRESHOLDS = {
  veryHappy: 80,    // 90% chance to re-sign
  happy: 60,        // 70% chance to re-sign
  neutral: 40,      // 50% chance to re-sign
  unhappy: 20,      // 30% chance to re-sign
  veryUnhappy: 0,   // 10% chance to re-sign
};

// ============================================
// SALARY CALCULATION
// ============================================

/**
 * Calculate salary based on player rating and tier
 * Uses a quadratic formula to make star players significantly more expensive
 */
export function calculateSalary(
  currentRating: number,
  potential: number,
  tier: Tier,
  age: number
): number {
  const tierConfig = TIER_CONFIGS[tier];
  const { minSalary, maxSalary } = tierConfig;

  // Base salary from rating (weighted average: 70% current, 30% potential)
  const effectiveRating = currentRating * 0.7 + potential * 0.3;

  // Normalize rating to 0-1 scale (rating range is typically 20-80)
  const normalizedRating = Math.max(0, Math.min(1, (effectiveRating - 20) / 60));

  // Quadratic scaling: stars cost exponentially more
  // Example: 50 rating = 0.5^2 = 0.25 of range
  //          70 rating = 0.83^2 = 0.69 of range
  const salaryMultiplier = Math.pow(normalizedRating, 1.8);

  // Age adjustment: prime years (26-30) command premium, older players cost less
  let ageModifier = 1.0;
  if (age >= 26 && age <= 30) {
    ageModifier = 1.15; // 15% premium for prime years
  } else if (age > 32) {
    ageModifier = 0.85 - (age - 32) * 0.05; // Declining value after 32
    ageModifier = Math.max(0.6, ageModifier); // Floor at 60%
  } else if (age < 23) {
    ageModifier = 0.9; // Young players cost slightly less (unproven)
  }

  // Calculate final salary
  const salaryRange = maxSalary - minSalary;
  let salary = minSalary + salaryRange * salaryMultiplier * ageModifier;

  // Clamp to tier bounds
  salary = Math.max(minSalary, Math.min(maxSalary, salary));

  // Round to nearest 1000
  return Math.round(salary / 1000) * 1000;
}

/**
 * Calculate contract length based on player rating and age
 */
export function calculateContractYears(
  currentRating: number,
  age: number
): number {
  // Determine tier based on rating
  let contractTier = CONTRACT_LENGTH_TIERS.replacement;

  if (currentRating >= CONTRACT_LENGTH_TIERS.elite.minRating) {
    contractTier = CONTRACT_LENGTH_TIERS.elite;
  } else if (currentRating >= CONTRACT_LENGTH_TIERS.good.minRating) {
    contractTier = CONTRACT_LENGTH_TIERS.good;
  } else if (currentRating >= CONTRACT_LENGTH_TIERS.average.minRating) {
    contractTier = CONTRACT_LENGTH_TIERS.average;
  }

  // Random years within range
  const yearsRange = contractTier.years.max - contractTier.years.min;
  let years = contractTier.years.min + Math.floor(Math.random() * (yearsRange + 1));

  // Age adjustment: older players get shorter deals
  if (age > 32) {
    years = Math.max(1, years - 1);
  }
  if (age > 35) {
    years = 1; // Veterans only get 1-year deals
  }

  return years;
}

// ============================================
// CONTRACT GENERATION
// ============================================

export interface ContractOffer {
  salary: number;
  years: number;
  totalValue: number;
  isQualifyingOffer: boolean;
}

/**
 * Generate a contract offer for a player
 */
export function generateContractOffer(
  player: Pick<Player, 'currentRating' | 'potential' | 'tier' | 'age'>,
  isRenewal: boolean = false
): ContractOffer {
  const salary = calculateSalary(
    player.currentRating,
    player.potential,
    player.tier,
    player.age
  );

  let years = calculateContractYears(player.currentRating, player.age);

  // Renewals can be shorter (1-2 years) to give flexibility
  if (isRenewal && years > 2) {
    years = Math.random() > 0.5 ? 2 : years;
  }

  return {
    salary,
    years,
    totalValue: salary * years,
    isQualifyingOffer: isRenewal,
  };
}

/**
 * Generate a rookie contract for newly drafted players
 * Rookies get lower salaries and shorter contracts
 */
export function generateRookieContract(
  currentRating: number,
  potential: number,
  tier: Tier
): ContractOffer {
  const tierConfig = TIER_CONFIGS[tier];

  // Rookies get near-minimum salary
  const baseMultiplier = 0.1 + (potential / 80) * 0.3; // 10-40% of range based on potential
  const salary = Math.round(
    (tierConfig.minSalary + (tierConfig.maxSalary - tierConfig.minSalary) * baseMultiplier) / 1000
  ) * 1000;

  // Rookies get 2-4 year deals based on draft position implied by potential
  let years: number;
  if (potential >= 70) {
    years = 4; // High potential = longer team control
  } else if (potential >= 55) {
    years = 3;
  } else {
    years = 2;
  }

  return {
    salary: Math.max(tierConfig.minSalary, salary),
    years,
    totalValue: salary * years,
    isQualifyingOffer: false,
  };
}

// ============================================
// FREE AGENCY LOGIC
// ============================================

/**
 * Calculate the probability a player will re-sign with the team
 * Based on morale, team success, and market factors
 */
export function calculateResignProbability(
  morale: number,
  teamWinPct: number,
  offerVsMarket: number // 1.0 = market rate, 0.8 = 80% of market, 1.2 = 120%
): number {
  // Base probability from morale
  let baseProbability: number;

  if (morale >= MORALE_THRESHOLDS.veryHappy) {
    baseProbability = 0.9;
  } else if (morale >= MORALE_THRESHOLDS.happy) {
    baseProbability = 0.7;
  } else if (morale >= MORALE_THRESHOLDS.neutral) {
    baseProbability = 0.5;
  } else if (morale >= MORALE_THRESHOLDS.unhappy) {
    baseProbability = 0.3;
  } else {
    baseProbability = 0.1;
  }

  // Winning team bonus (up to +15%)
  const winBonus = Math.min(0.15, (teamWinPct - 0.5) * 0.5);

  // Salary offer adjustment
  // Below market = lower chance, above market = higher chance
  const salaryAdjustment = (offerVsMarket - 1.0) * 0.3; // ±30% max impact

  // Calculate final probability
  let probability = baseProbability + winBonus + salaryAdjustment;

  // Clamp between 5% and 95%
  return Math.max(0.05, Math.min(0.95, probability));
}

/**
 * Determine if a player accepts a contract offer
 */
export function playerAcceptsOffer(
  player: Pick<Player, 'morale' | 'currentRating'>,
  offer: ContractOffer,
  teamWinPct: number = 0.5
): boolean {
  // Calculate market rate for comparison
  const marketRate = calculateSalary(
    player.currentRating,
    player.currentRating, // Use current for market comparison
    'LOW_A' as Tier, // Will be adjusted
    25 // Average age
  );

  const offerRatio = offer.salary / Math.max(1, marketRate);
  const resignProbability = calculateResignProbability(
    player.morale,
    teamWinPct,
    offerRatio
  );

  return Math.random() < resignProbability;
}

// ============================================
// PAYROLL MANAGEMENT
// ============================================

export interface PayrollSummary {
  totalPayroll: number;
  salaryCap: number;
  capSpace: number;
  overCap: boolean;
  luxuryTaxThreshold: number;
  inLuxuryTax: boolean;
  playerSalaries: { playerId: string; name: string; salary: number }[];
}

/**
 * Calculate total payroll and cap status
 */
export function calculatePayroll(
  players: Pick<Player, 'id' | 'firstName' | 'lastName' | 'salary' | 'rosterStatus'>[],
  tier: Tier
): PayrollSummary {
  const tierConfig = TIER_CONFIGS[tier];
  const salaryCap = tierConfig.salaryCap;
  const luxuryTaxThreshold = salaryCap * 1.2; // 20% above cap

  // Only count active roster for cap purposes
  const activeRoster = players.filter(p => p.rosterStatus === 'ACTIVE');

  const playerSalaries = activeRoster.map(p => ({
    playerId: p.id,
    name: `${p.firstName} ${p.lastName}`,
    salary: p.salary,
  }));

  const totalPayroll = playerSalaries.reduce((sum, p) => sum + p.salary, 0);

  return {
    totalPayroll,
    salaryCap,
    capSpace: salaryCap - totalPayroll,
    overCap: totalPayroll > salaryCap,
    luxuryTaxThreshold,
    inLuxuryTax: totalPayroll > luxuryTaxThreshold,
    playerSalaries: playerSalaries.sort((a, b) => b.salary - a.salary),
  };
}

/**
 * Check if a new salary would fit under the cap
 */
export function canAffordSalary(
  currentPayroll: number,
  newSalary: number,
  salaryCap: number,
  allowOverCap: boolean = false
): boolean {
  if (allowOverCap) {
    // Allow up to 20% over cap (luxury tax territory)
    return currentPayroll + newSalary <= salaryCap * 1.2;
  }
  return currentPayroll + newSalary <= salaryCap;
}

// ============================================
// CONTRACT EXPIRATION & FREE AGENCY
// ============================================

export interface FreeAgentResult {
  playerId: string;
  playerName: string;
  outcome: 'resigned' | 'departed' | 'offer_pending';
  newContract?: ContractOffer;
  destination?: string; // AI team name if departed
}

/**
 * Process contract expiration for a single player
 * Returns whether the player re-signed or left
 */
export function processContractExpiration(
  player: Player,
  teamWinPct: number,
  offerContract: boolean = true
): FreeAgentResult {
  const playerName = `${player.firstName} ${player.lastName}`;

  if (!offerContract) {
    // Team chose not to offer, player leaves
    return {
      playerId: player.id,
      playerName,
      outcome: 'departed',
      destination: getRandomDestination(),
    };
  }

  // Generate renewal offer
  const offer = generateContractOffer(player, true);

  // Check if player accepts
  if (playerAcceptsOffer(player, offer, teamWinPct)) {
    return {
      playerId: player.id,
      playerName,
      outcome: 'resigned',
      newContract: offer,
    };
  }

  // Player rejected offer, goes to free agency
  return {
    playerId: player.id,
    playerName,
    outcome: 'departed',
    destination: getRandomDestination(),
  };
}

/**
 * Get a random AI team destination for departed players
 */
function getRandomDestination(): string {
  const destinations = [
    'Steel City Hammers',
    'River City Rapids',
    'Port City Sailors',
    'Forest City Foresters',
    'Lakeside Lakers',
    'Bay City Buccaneers',
    'Metro City Meteors',
    'Riverside Royals',
  ];
  return destinations[Math.floor(Math.random() * destinations.length)];
}

/**
 * Decrement contract years at end of season
 * Returns list of players whose contracts expired (years hit 0)
 */
export function decrementContracts(
  players: Player[]
): { playerId: string; playerName: string }[] {
  const expiring: { playerId: string; playerName: string }[] = [];

  for (const player of players) {
    if (player.contractYears <= 1) {
      // Contract expires this year
      expiring.push({
        playerId: player.id,
        playerName: `${player.firstName} ${player.lastName}`,
      });
    }
  }

  return expiring;
}

// ============================================
// MIGRATION HELPERS
// ============================================

/**
 * Generate initial contracts for players without them
 * Used for migrating existing games
 */
export function generateMigrationContract(
  player: Pick<Player, 'currentRating' | 'potential' | 'tier' | 'age' | 'yearsInOrg'>
): { salary: number; contractYears: number } {
  const salary = calculateSalary(
    player.currentRating,
    player.potential,
    player.tier,
    player.age
  );

  // Years based on how long they've been in org (simulate existing contract)
  // Newer players get longer contracts, veterans are closer to expiry
  const baseYears = calculateContractYears(player.currentRating, player.age);
  const yearsRemaining = Math.max(1, baseYears - Math.floor(player.yearsInOrg / 2));

  return {
    salary,
    contractYears: yearsRemaining,
  };
}
