// ============================================
// Financial Simulation Engine
// Revenue streams, expenses, and bankruptcy
// ============================================

import type {
  Tier,
  FinancialSimulationResult,
  CurrentFranchise,
  CityState,
  Player,
  TIER_CONFIGS,
} from '@/lib/types';

// ============================================
// CONFIGURATION
// ============================================

const FINANCIAL_CONFIG = {
  // Concession revenue per fan
  CONCESSION_PER_FAN_BASE: 12,

  // Parking
  PARKING_DRIVE_PCT: 0.25,  // 25% of fans drive
  PARKING_PRICE: 20,

  // Merchandise base per fan (modified by pride)
  MERCHANDISE_PER_FAN_BASE: 8,

  // Sponsorship tiers
  SPONSORSHIPS: {
    LOCAL: { min: 25000, max: 500000 },
    REGIONAL: { min: 150000, max: 2000000, minTier: 'HIGH_A' as Tier },
    NATIONAL: { min: 2000000, max: 10000000, minTier: 'TRIPLE_A' as Tier },
  },

  // Travel costs per tier
  TRAVEL_COSTS: {
    LOW_A: 50000,
    HIGH_A: 100000,
    DOUBLE_A: 200000,
    TRIPLE_A: 350000,
    MLB: 500000,
  } as Record<Tier, number>,

  // Stadium maintenance as percentage of value
  MAINTENANCE_PCT: 0.05,

  // Stadium value by tier
  STADIUM_VALUES: {
    LOW_A: 5000000,
    HIGH_A: 15000000,
    DOUBLE_A: 40000000,
    TRIPLE_A: 80000000,
    MLB: 500000000,
  } as Record<Tier, number>,

  // Debt interest rate
  DEBT_INTEREST_RATE: 0.08,

  // Bankruptcy thresholds (as multiple of budget)
  BANKRUPTCY: {
    WARNING_THRESHOLD: 0.5,      // 50% of budget in debt
    CRITICAL_THRESHOLD: 1.0,     // 100% of budget in debt
    IMMINENT_THRESHOLD: 1.5,     // 150% of budget in debt
    BANKRUPT_THRESHOLD: 2.0,     // 200% of budget = game over
  },
};

// ============================================
// REVENUE CALCULATIONS
// ============================================

/**
 * Calculate ticket revenue for the season
 */
export function calculateTicketRevenue(
  totalAttendance: number,
  ticketPrice: number
): number {
  return Math.round(totalAttendance * ticketPrice);
}

/**
 * Calculate concession revenue
 *
 * From PRD: Revenue = attendance × $12 × (1 + stadiumQuality/200)
 */
export function calculateConcessionRevenue(
  totalAttendance: number,
  stadiumQuality: number
): number {
  const qualityMultiplier = 1 + (stadiumQuality / 200);
  return Math.round(
    totalAttendance * FINANCIAL_CONFIG.CONCESSION_PER_FAN_BASE * qualityMultiplier
  );
}

/**
 * Calculate parking revenue
 *
 * From PRD: Revenue = floor(attendance × 0.25) × $20
 */
export function calculateParkingRevenue(totalAttendance: number): number {
  const driversCount = Math.floor(totalAttendance * FINANCIAL_CONFIG.PARKING_DRIVE_PCT);
  return driversCount * FINANCIAL_CONFIG.PARKING_PRICE;
}

/**
 * Calculate merchandise revenue
 *
 * From PRD: Revenue = attendance × $8 × (cityPride / 100)
 */
export function calculateMerchandiseRevenue(
  totalAttendance: number,
  cityPride: number
): number {
  const prideMultiplier = cityPride / 100;
  return Math.round(
    totalAttendance * FINANCIAL_CONFIG.MERCHANDISE_PER_FAN_BASE * prideMultiplier
  );
}

/**
 * Calculate sponsorship revenue
 *
 * Based on tier and city recognition
 */
export function calculateSponsorshipRevenue(
  tier: Tier,
  cityPride: number,
  nationalRecognition: number,
  wonChampionship: boolean
): number {
  let totalSponsorship = 0;

  // Local sponsorships (all tiers)
  const localBase = FINANCIAL_CONFIG.SPONSORSHIPS.LOCAL.min;
  const localMax = FINANCIAL_CONFIG.SPONSORSHIPS.LOCAL.max;
  const localMultiplier = 0.3 + (cityPride / 100) * 0.7;
  totalSponsorship += localBase + (localMax - localBase) * localMultiplier;

  // Regional sponsorships (High-A+)
  const tierOrder: Tier[] = ['LOW_A', 'HIGH_A', 'DOUBLE_A', 'TRIPLE_A', 'MLB'];
  const tierIndex = tierOrder.indexOf(tier);
  const regionalMinIndex = tierOrder.indexOf(FINANCIAL_CONFIG.SPONSORSHIPS.REGIONAL.minTier);

  if (tierIndex >= regionalMinIndex) {
    const regionalBase = FINANCIAL_CONFIG.SPONSORSHIPS.REGIONAL.min;
    const regionalMax = FINANCIAL_CONFIG.SPONSORSHIPS.REGIONAL.max;
    const regionalMultiplier = 0.2 + (cityPride / 100) * 0.4 + (nationalRecognition / 100) * 0.4;
    totalSponsorship += regionalBase + (regionalMax - regionalBase) * regionalMultiplier;
  }

  // National sponsorships (Triple-A+)
  const nationalMinIndex = tierOrder.indexOf(FINANCIAL_CONFIG.SPONSORSHIPS.NATIONAL.minTier);

  if (tierIndex >= nationalMinIndex) {
    const nationalBase = FINANCIAL_CONFIG.SPONSORSHIPS.NATIONAL.min;
    const nationalMax = FINANCIAL_CONFIG.SPONSORSHIPS.NATIONAL.max;
    const nationalMultiplier = 0.1 + (nationalRecognition / 100) * 0.6 + (wonChampionship ? 0.3 : 0);
    totalSponsorship += nationalBase + (nationalMax - nationalBase) * nationalMultiplier;
  }

  return Math.round(totalSponsorship);
}

// ============================================
// EXPENSE CALCULATIONS
// ============================================

/**
 * Calculate total player salaries
 */
export function calculatePlayerSalaries(players: Player[]): number {
  return players
    .filter(p => p.isOnRoster)
    .reduce((sum, p) => sum + p.salary, 0);
}

/**
 * Calculate coaching salaries
 */
export function calculateCoachingSalaries(franchise: CurrentFranchise): number {
  return (
    franchise.hittingCoachSalary +
    franchise.pitchingCoachSalary +
    franchise.developmentCoordSalary
  );
}

/**
 * Calculate stadium maintenance costs
 */
export function calculateStadiumMaintenance(tier: Tier): number {
  const stadiumValue = FINANCIAL_CONFIG.STADIUM_VALUES[tier];
  return Math.round(stadiumValue * FINANCIAL_CONFIG.MAINTENANCE_PCT);
}

/**
 * Calculate travel costs
 */
export function calculateTravelCosts(tier: Tier): number {
  return FINANCIAL_CONFIG.TRAVEL_COSTS[tier];
}

/**
 * Calculate debt service (interest on negative reserves)
 */
export function calculateDebtService(currentDebt: number): number {
  if (currentDebt >= 0) return 0;

  const debt = Math.abs(currentDebt);
  return Math.round(debt * FINANCIAL_CONFIG.DEBT_INTEREST_RATE);
}

// ============================================
// FULL FINANCIAL SIMULATION
// ============================================

export interface FinancialSimulationInput {
  players: Player[];
  franchise: CurrentFranchise;
  cityState: CityState;
  totalAttendance: number;
  wonChampionship: boolean;
  marketingSpend: number;
}

/**
 * Run complete financial simulation for a season
 */
export function simulateFinances(
  input: FinancialSimulationInput
): FinancialSimulationResult {
  const {
    players,
    franchise,
    cityState,
    totalAttendance,
    wonChampionship,
    marketingSpend,
  } = input;

  // Calculate all revenue streams
  const ticketRevenue = calculateTicketRevenue(
    totalAttendance,
    franchise.ticketPrice
  );

  const concessionRevenue = calculateConcessionRevenue(
    totalAttendance,
    franchise.stadiumQuality
  );

  const parkingRevenue = calculateParkingRevenue(totalAttendance);

  const merchandiseRevenue = calculateMerchandiseRevenue(
    totalAttendance,
    cityState.teamPride
  );

  const sponsorshipRevenue = calculateSponsorshipRevenue(
    franchise.tier,
    cityState.teamPride,
    cityState.nationalRecognition,
    wonChampionship
  );

  const totalRevenue =
    ticketRevenue +
    concessionRevenue +
    parkingRevenue +
    merchandiseRevenue +
    sponsorshipRevenue;

  // Calculate all expenses
  const playerSalaries = calculatePlayerSalaries(players);
  const coachingSalaries = calculateCoachingSalaries(franchise);
  const stadiumMaintenance = calculateStadiumMaintenance(franchise.tier);
  const travelCosts = calculateTravelCosts(franchise.tier);
  const debtService = calculateDebtService(franchise.reserves);

  const totalExpenses =
    playerSalaries +
    coachingSalaries +
    stadiumMaintenance +
    travelCosts +
    marketingSpend +
    debtService;

  // Calculate net income and new reserves
  const netIncome = totalRevenue - totalExpenses;
  const newReserves = franchise.reserves + netIncome;

  // Determine debt level and bankruptcy risk
  const debtLevel = newReserves < 0 ? Math.abs(newReserves) : 0;
  const debtRatio = debtLevel / franchise.budget;

  let bankruptcyRisk: 'none' | 'warning' | 'critical' | 'imminent';

  if (debtRatio >= FINANCIAL_CONFIG.BANKRUPTCY.IMMINENT_THRESHOLD) {
    bankruptcyRisk = 'imminent';
  } else if (debtRatio >= FINANCIAL_CONFIG.BANKRUPTCY.CRITICAL_THRESHOLD) {
    bankruptcyRisk = 'critical';
  } else if (debtRatio >= FINANCIAL_CONFIG.BANKRUPTCY.WARNING_THRESHOLD) {
    bankruptcyRisk = 'warning';
  } else {
    bankruptcyRisk = 'none';
  }

  return {
    revenue: {
      tickets: ticketRevenue,
      concessions: concessionRevenue,
      parking: parkingRevenue,
      merchandise: merchandiseRevenue,
      sponsorships: sponsorshipRevenue,
      total: totalRevenue,
    },

    expenses: {
      playerSalaries,
      coachingSalaries,
      stadiumMaintenance,
      travel: travelCosts,
      marketing: marketingSpend,
      debtService,
      total: totalExpenses,
    },

    netIncome,
    newReserves,
    debtLevel,
    bankruptcyRisk,
  };
}

// ============================================
// BANKRUPTCY CHECKS
// ============================================

export interface BankruptcyStatus {
  isBankrupt: boolean;
  debtRatio: number;
  riskLevel: 'none' | 'warning' | 'critical' | 'imminent' | 'bankrupt';
  message: string;
  recoveryOptions: string[];
}

/**
 * Check bankruptcy status and provide guidance
 */
export function checkBankruptcyStatus(
  reserves: number,
  budget: number
): BankruptcyStatus {
  const debt = reserves < 0 ? Math.abs(reserves) : 0;
  const debtRatio = debt / budget;

  if (debtRatio >= FINANCIAL_CONFIG.BANKRUPTCY.BANKRUPT_THRESHOLD) {
    return {
      isBankrupt: true,
      debtRatio,
      riskLevel: 'bankrupt',
      message: 'BANKRUPTCY - Your franchise has been seized by creditors. Game Over.',
      recoveryOptions: [],
    };
  }

  if (debtRatio >= FINANCIAL_CONFIG.BANKRUPTCY.IMMINENT_THRESHOLD) {
    return {
      isBankrupt: false,
      debtRatio,
      riskLevel: 'imminent',
      message: 'CRITICAL: City threatens seizure. One more losing season = bankruptcy.',
      recoveryOptions: [
        'Fire-sale veteran players for cash',
        'Reduce ticket prices to boost attendance',
        'Cut coaching staff to minimum',
        'Skip stadium maintenance (risky)',
      ],
    };
  }

  if (debtRatio >= FINANCIAL_CONFIG.BANKRUPTCY.CRITICAL_THRESHOLD) {
    return {
      isBankrupt: false,
      debtRatio,
      riskLevel: 'critical',
      message: 'Bank demands repayment plan. Must trade players for cash.',
      recoveryOptions: [
        'Trade valuable players for cash or picks',
        'Reduce expenses across the board',
        'Focus on developing cheap young talent',
      ],
    };
  }

  if (debtRatio >= FINANCIAL_CONFIG.BANKRUPTCY.WARNING_THRESHOLD) {
    return {
      isBankrupt: false,
      debtRatio,
      riskLevel: 'warning',
      message: 'City council concerned about team finances.',
      recoveryOptions: [
        'Review expense allocation',
        'Consider lower-cost coaching options',
        'Focus on revenue-generating wins',
      ],
    };
  }

  return {
    isBankrupt: false,
    debtRatio,
    riskLevel: 'none',
    message: 'Finances are healthy.',
    recoveryOptions: [],
  };
}

// ============================================
// BUDGET RECOMMENDATIONS
// ============================================

export interface BudgetRecommendation {
  category: string;
  currentSpend: number;
  recommendedSpend: number;
  reasoning: string;
}

/**
 * Generate budget recommendations based on current situation
 */
export function generateBudgetRecommendations(
  franchise: CurrentFranchise,
  players: Player[],
  cityState: CityState,
  tierConfigs: typeof TIER_CONFIGS
): BudgetRecommendation[] {
  const recommendations: BudgetRecommendation[] = [];
  const tierConfig = tierConfigs[franchise.tier];

  // Coaching recommendations
  const currentCoachingSpend = calculateCoachingSalaries(franchise);
  const coachingBudgetPct = currentCoachingSpend / franchise.budget;

  if (coachingBudgetPct < 0.03) {
    recommendations.push({
      category: 'Coaching',
      currentSpend: currentCoachingSpend,
      recommendedSpend: Math.round(franchise.budget * 0.05),
      reasoning: 'Coaching budget is too low. Better coaches accelerate player development.',
    });
  } else if (coachingBudgetPct > 0.10) {
    recommendations.push({
      category: 'Coaching',
      currentSpend: currentCoachingSpend,
      recommendedSpend: Math.round(franchise.budget * 0.07),
      reasoning: 'Coaching budget is high. Consider reallocating to player salaries.',
    });
  }

  // Ticket pricing recommendations
  const midPrice = (tierConfig.ticketPriceRange.min + tierConfig.ticketPriceRange.max) / 2;
  if (franchise.ticketPrice < tierConfig.ticketPriceRange.min) {
    recommendations.push({
      category: 'Ticket Pricing',
      currentSpend: franchise.ticketPrice,
      recommendedSpend: midPrice,
      reasoning: 'Ticket prices are below market rate. Consider raising prices.',
    });
  } else if (cityState.unemploymentRate > 10 && franchise.ticketPrice > midPrice) {
    recommendations.push({
      category: 'Ticket Pricing',
      currentSpend: franchise.ticketPrice,
      recommendedSpend: tierConfig.ticketPriceRange.min + (midPrice - tierConfig.ticketPriceRange.min) * 0.5,
      reasoning: 'High unemployment may reduce attendance. Consider lower prices.',
    });
  }

  // Roster balance recommendations
  const rosterPlayers = players.filter(p => p.isOnRoster);
  const avgSalary = rosterPlayers.reduce((sum, p) => sum + p.salary, 0) / rosterPlayers.length;
  const salaryBudgetPct = calculatePlayerSalaries(players) / franchise.budget;

  if (salaryBudgetPct > 0.7) {
    recommendations.push({
      category: 'Player Salaries',
      currentSpend: calculatePlayerSalaries(players),
      recommendedSpend: Math.round(franchise.budget * 0.6),
      reasoning: 'Player salaries consume too much budget. Consider trading expensive veterans.',
    });
  }

  return recommendations;
}

// ============================================
// SALARY CALCULATIONS
// ============================================

/**
 * Calculate appropriate salary for a player based on rating and tier
 */
export function calculatePlayerSalary(
  rating: number,
  tier: Tier,
  yearsInOrg: number
): number {
  // Base salaries by tier
  const baseSalaries: Record<Tier, number> = {
    LOW_A: 10000,
    HIGH_A: 30000,
    DOUBLE_A: 100000,
    TRIPLE_A: 300000,
    MLB: 750000, // MLB minimum
  };

  const base = baseSalaries[tier];

  // Rating multiplier (50 rating = 1x, 70 rating = 3x, etc.)
  const ratingMultiplier = Math.pow(rating / 50, 2);

  // Experience bonus (2% per year)
  const experienceMultiplier = 1 + (yearsInOrg * 0.02);

  return Math.round(base * ratingMultiplier * experienceMultiplier);
}

/**
 * Calculate total roster salary requirements
 */
export function calculateMinimumRosterCost(
  tier: Tier,
  rosterSize: number = 25
): number {
  const minSalaries: Record<Tier, number> = {
    LOW_A: 10000,
    HIGH_A: 30000,
    DOUBLE_A: 100000,
    TRIPLE_A: 300000,
    MLB: 750000,
  };

  return minSalaries[tier] * rosterSize;
}
