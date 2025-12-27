// ============================================
// Baseball GM Simulator - Core Type Definitions
// ============================================

// ============================================
// ENUMS & CONSTANTS
// ============================================

export type Tier = 'LOW_A' | 'HIGH_A' | 'DOUBLE_A' | 'TRIPLE_A' | 'MLB';

export type Position =
  | 'SP' | 'RP' | 'C' | '1B' | '2B' | '3B' | 'SS' | 'LF' | 'CF' | 'RF' | 'DH';

export type PlayerType = 'HITTER' | 'PITCHER';

export type WorkEthic = 'poor' | 'average' | 'excellent';

export type Personality = 'team_player' | 'prima_donna' | 'leader';

export type DraftStrategy = 'best_available' | 'need_based' | 'upside_swing' | 'safe_floor';

export type ScoutingTier = 'low' | 'medium' | 'high';

export type BuildingState = 0 | 1 | 2 | 3 | 4;

export type BuildingType = 'restaurant' | 'bar' | 'retail' | 'hotel' | 'corporate';

export type DifficultyMode = 'easy' | 'normal' | 'hard';

export type GamePhase = 'pre_season' | 'draft' | 'season' | 'post_season' | 'off_season';

// Roster Status for Two-Tier System
export type RosterStatus = 'ACTIVE' | 'RESERVE';

// Facility Levels for Farm System capacity
export type FacilityLevel = 0 | 1 | 2;

// Player archetypes based on dominant attributes
export type Archetype =
  | 'Slugger'      // High power hitter
  | 'Speedster'    // High speed player
  | 'Contact King' // High hit rating
  | 'Glove Wizard' // High fielding
  | 'Cannon Arm'   // High arm strength
  | 'Flamethrower' // High stuff (pitcher)
  | 'Command Ace'  // High control (pitcher)
  | 'Movement Master' // High movement (pitcher)
  | 'Playmaker'    // Balanced/well-rounded
  | 'Raw Talent';  // High potential but unrefined

// Training Focus - determines which attribute gains XP
export type HitterTrainingFocus = 'hit' | 'power' | 'speed' | 'arm' | 'field';
export type PitcherTrainingFocus = 'stuff' | 'control' | 'movement';
export type TrainingFocus = HitterTrainingFocus | PitcherTrainingFocus | 'overall';

// Training focus configuration
export const TRAINING_FOCUS_CONFIG: Record<TrainingFocus, {
  label: string;
  description: string;
  playerType: 'HITTER' | 'PITCHER' | 'BOTH';
}> = {
  // Hitter focuses
  hit: {
    label: 'Contact',
    description: 'Improve plate discipline and bat-to-ball skills',
    playerType: 'HITTER',
  },
  power: {
    label: 'Power',
    description: 'Build raw strength for extra-base hits',
    playerType: 'HITTER',
  },
  speed: {
    label: 'Speed',
    description: 'Improve baserunning and stolen base ability',
    playerType: 'HITTER',
  },
  arm: {
    label: 'Arm Strength',
    description: 'Develop throwing power and accuracy',
    playerType: 'HITTER',
  },
  field: {
    label: 'Defense',
    description: 'Sharpen fielding mechanics and range',
    playerType: 'HITTER',
  },
  // Pitcher focuses
  stuff: {
    label: 'Velocity',
    description: 'Increase pitch speed and movement quality',
    playerType: 'PITCHER',
  },
  control: {
    label: 'Command',
    description: 'Improve pitch location and accuracy',
    playerType: 'PITCHER',
  },
  movement: {
    label: 'Movement',
    description: 'Develop pitch break and deception',
    playerType: 'PITCHER',
  },
  // Universal
  overall: {
    label: 'Balanced',
    description: 'Steady improvement across all skills',
    playerType: 'BOTH',
  },
};

// ============================================
// TIER CONFIGURATION
// ============================================

export interface TierConfig {
  tier: Tier;
  name: string;
  budget: number;
  salaryCap: number;        // Maximum total payroll allowed
  minSalary: number;        // Minimum player salary
  maxSalary: number;        // Maximum individual player salary
  stadiumCapacity: number;
  seasonLength: number;
  averageOpponentStrength: number;
  playerAgeRange: { min: number; max: number };
  ratingRange: { min: number; max: number };
  scoutingBudget: number;
  ticketPriceRange: { min: number; max: number };
  cityPopulation: number;
  unemploymentRate: number;
  medianIncome: number;
  promotionRequirements: {
    winPct: number;
    consecutiveYears: number;
    reserves: number;
    cityPride: number;
    divisionTitle?: boolean;
    leagueChampionship?: boolean;
  } | null;
}

export const TIER_CONFIGS: Record<Tier, TierConfig> = {
  LOW_A: {
    tier: 'LOW_A',
    name: 'Low-A',
    budget: 500000,
    salaryCap: 300000,        // ~60% of budget for payroll
    minSalary: 5000,          // Minimum salary per player
    maxSalary: 25000,         // Max individual salary
    stadiumCapacity: 2500,
    seasonLength: 132,
    averageOpponentStrength: 42,
    playerAgeRange: { min: 18, max: 21 },
    ratingRange: { min: 30, max: 55 },
    scoutingBudget: 50000,
    ticketPriceRange: { min: 5, max: 12 },
    cityPopulation: 15000,
    unemploymentRate: 18,
    medianIncome: 32000,
    promotionRequirements: {
      winPct: 0.55,
      consecutiveYears: 2,
      reserves: 50000,
      cityPride: 50,
    },
  },
  HIGH_A: {
    tier: 'HIGH_A',
    name: 'High-A',
    budget: 2000000,
    salaryCap: 1200000,       // ~60% of budget for payroll
    minSalary: 15000,
    maxSalary: 80000,
    stadiumCapacity: 5000,
    seasonLength: 132,
    averageOpponentStrength: 48,
    playerAgeRange: { min: 20, max: 23 },
    ratingRange: { min: 40, max: 65 },
    scoutingBudget: 150000,
    ticketPriceRange: { min: 8, max: 20 },
    cityPopulation: 25000,
    unemploymentRate: 12,
    medianIncome: 38000,
    promotionRequirements: {
      winPct: 0.575,
      consecutiveYears: 2,
      reserves: 200000,
      cityPride: 60,
      divisionTitle: true,
    },
  },
  DOUBLE_A: {
    tier: 'DOUBLE_A',
    name: 'Double-A',
    budget: 8000000,
    salaryCap: 5000000,       // ~62% of budget for payroll
    minSalary: 50000,
    maxSalary: 400000,
    stadiumCapacity: 10000,
    seasonLength: 138,
    averageOpponentStrength: 55,
    playerAgeRange: { min: 22, max: 25 },
    ratingRange: { min: 50, max: 72 },
    scoutingBudget: 300000,
    ticketPriceRange: { min: 12, max: 35 },
    cityPopulation: 45000,
    unemploymentRate: 7,
    medianIncome: 48000,
    promotionRequirements: {
      winPct: 0.6,
      consecutiveYears: 2,
      reserves: 500000,
      cityPride: 70,
      divisionTitle: true,
    },
  },
  TRIPLE_A: {
    tier: 'TRIPLE_A',
    name: 'Triple-A',
    budget: 25000000,
    salaryCap: 15000000,      // ~60% of budget for payroll
    minSalary: 150000,
    maxSalary: 1500000,
    stadiumCapacity: 18000,
    seasonLength: 144,
    averageOpponentStrength: 62,
    playerAgeRange: { min: 23, max: 27 },
    ratingRange: { min: 60, max: 80 },
    scoutingBudget: 500000,
    ticketPriceRange: { min: 18, max: 55 },
    cityPopulation: 85000,
    unemploymentRate: 4,
    medianIncome: 58000,
    promotionRequirements: {
      winPct: 0.6,
      consecutiveYears: 2,
      reserves: 2000000,
      cityPride: 80,
      leagueChampionship: true,
    },
  },
  MLB: {
    tier: 'MLB',
    name: 'MLB',
    budget: 150000000,
    salaryCap: 100000000,     // ~67% of budget for payroll (competitive MLB)
    minSalary: 750000,        // MLB minimum
    maxSalary: 35000000,      // Star player max
    stadiumCapacity: 42000,
    seasonLength: 162,
    averageOpponentStrength: 70,
    playerAgeRange: { min: 24, max: 35 },
    ratingRange: { min: 70, max: 85 },
    scoutingBudget: 2000000,
    ticketPriceRange: { min: 25, max: 150 },
    cityPopulation: 200000,
    unemploymentRate: 3,
    medianIncome: 72000,
    promotionRequirements: null, // No promotion from MLB
  },
};

// ============================================
// PLAYER TYPES
// ============================================

export interface HitterAttributes {
  hit: number;      // Contact + Plate Discipline (20-80)
  power: number;    // Raw strength (20-80)
  speed: number;    // Running (20-80)
  arm: number;      // Throwing (20-80)
  field: number;    // Defense (20-80)
}

export interface PitcherAttributes {
  stuff: number;    // Pitch quality/velocity (20-80)
  control: number;  // Command (20-80)
  movement: number; // Break (20-80)
}

export interface HiddenTraits {
  workEthic: WorkEthic;
  injuryProne: boolean;
  personality: Personality;
  coachability: number;  // 20-80
  clutch: number;        // 20-80
}

// ============================================
// SEASON STATISTICS TYPES
// ============================================

export interface BatterSeasonStats {
  games: number;
  plateAppearances: number;
  atBats: number;
  hits: number;
  doubles: number;
  triples: number;
  homeRuns: number;
  runs: number;
  rbi: number;
  walks: number;
  strikeouts: number;
  stolenBases: number;
  caughtStealing: number;
  battingAvg: number;    // .305 format
  obp: number;           // .380 format
  slg: number;           // .520 format
  ops: number;           // .900 format
  war: number;           // 3.5 format
}

export interface PitcherSeasonStats {
  games: number;
  gamesStarted: number;
  wins: number;
  losses: number;
  saves: number;
  inningsPitched: number;
  hits: number;
  runs: number;
  earnedRuns: number;
  walks: number;
  strikeouts: number;
  homeRunsAllowed: number;
  era: number;           // 3.45 format
  whip: number;          // 1.15 format
  kPer9: number;         // 9.5 format
  bbPer9: number;        // 2.3 format
  war: number;           // 2.5 format
}

export type PlayerSeasonStats = BatterSeasonStats | PitcherSeasonStats;

export interface Player {
  id: string;
  gameId: string;

  // Basic Info
  firstName: string;
  lastName: string;
  age: number;
  position: Position;
  playerType: PlayerType;

  // Ratings (20-80 scale)
  currentRating: number;
  potential: number;

  // Attributes (based on player type)
  hitterAttributes: HitterAttributes | null;
  pitcherAttributes: PitcherAttributes | null;

  // Hidden traits (discovered through scouting)
  hiddenTraits: HiddenTraits;
  traitsRevealed: boolean;

  // Development
  tier: Tier;
  yearsAtTier: number;
  confidence: number;       // 0-100
  morale: number;           // 0-100
  gamesPlayed: number;
  yearsInOrg: number;

  // Training System
  trainingFocus: TrainingFocus;  // Skill being trained
  currentXp: number;             // 0-100, triggers +1 rating at 100
  progressionRate: number;       // Hidden modifier (0.5-2.0) based on age/potential

  // Contract
  salary: number;
  contractYears: number;

  // Status
  isInjured: boolean;
  injuryGamesRemaining: number;
  isOnRoster: boolean;
  rosterStatus: RosterStatus; // ACTIVE (25-man) or RESERVE (farm system)

  // Season Statistics (populated after season simulation)
  seasonStats: PlayerSeasonStats | null;

  // Draft Info
  draftYear: number;
  draftRound: number;
  draftPick: number;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export interface DraftProspect extends Omit<Player, 'id' | 'gameId' | 'tier' | 'yearsAtTier' | 'confidence' | 'morale' | 'gamesPlayed' | 'yearsInOrg' | 'salary' | 'contractYears' | 'isInjured' | 'injuryGamesRemaining' | 'isOnRoster' | 'rosterStatus' | 'seasonStats' | 'draftYear' | 'draftRound' | 'draftPick' | 'createdAt' | 'updatedAt'> {
  prospectId: string;
  scoutedRating: number | null;  // What we think the rating is
  scoutedPotential: number | null;
  scoutingAccuracy: ScoutingTier | null;
  isDrafted: boolean;
  draftedByTeam: string | null;

  // Smart Draft features
  mediaRank: number;        // Consensus rank (1-800) based on potential + noise
  archetype: Archetype;     // Player archetype based on dominant attributes
}

// ============================================
// FACILITY CONFIGURATION
// ============================================

export interface FacilityConfig {
  level: FacilityLevel;
  name: string;
  description: string;
  reserveSlots: number;
  upgradeCost: number | null; // null = max level
}

export const FACILITY_CONFIGS: Record<FacilityLevel, FacilityConfig> = {
  0: {
    level: 0,
    name: 'Basic Dugout',
    description: 'Standard facilities with minimal farm system capacity.',
    reserveSlots: 5,
    upgradeCost: 150000, // Cost to upgrade to Level 1
  },
  1: {
    level: 1,
    name: 'Minor League Complex',
    description: 'Dedicated training facility with expanded reserve capacity.',
    reserveSlots: 20, // +15 slots
    upgradeCost: 500000, // Cost to upgrade to Level 2
  },
  2: {
    level: 2,
    name: 'Player Development Lab',
    description: 'State-of-the-art development center with maximum farm system support.',
    reserveSlots: 40, // +20 more slots (total 40)
    upgradeCost: null, // Max level
  },
};

// Active roster is always 25
export const ACTIVE_ROSTER_LIMIT = 25;

// Helper function to get roster capacities based on facility level
export function getRosterCapacities(facilityLevel: FacilityLevel): {
  activeMax: number;
  reserveMax: number;
  totalMax: number;
} {
  const facilityConfig = FACILITY_CONFIGS[facilityLevel];
  return {
    activeMax: ACTIVE_ROSTER_LIMIT,
    reserveMax: facilityConfig.reserveSlots,
    totalMax: ACTIVE_ROSTER_LIMIT + facilityConfig.reserveSlots,
  };
}

// ============================================
// GAME & FRANCHISE TYPES
// ============================================

export interface Game {
  id: string;
  userId: string;
  cityName: string;
  teamName: string;
  difficulty: DifficultyMode;
  currentYear: number;
  currentPhase: GamePhase;
  currentTier: Tier;
  createdAt: Date;
  updatedAt: Date;
}

export interface CurrentFranchise {
  id: string;
  gameId: string;

  // Current State
  tier: Tier;
  budget: number;
  reserves: number;

  // Stadium
  stadiumName: string;
  stadiumCapacity: number;
  stadiumQuality: number;  // 0-100

  // Coaching
  hittingCoachSkill: number;    // 20-80
  hittingCoachSalary: number;
  pitchingCoachSkill: number;   // 20-80
  pitchingCoachSalary: number;
  developmentCoordSkill: number; // 20-80
  developmentCoordSalary: number;

  // Ticket Pricing
  ticketPrice: number;

  // Facilities (Two-Tier Roster System)
  facilityLevel: FacilityLevel; // 0 = Basic, 1 = Minor League Complex, 2 = Dev Lab

  // Progression
  consecutiveWinningSeasons: number;
  consecutiveDivisionTitles: number;

  updatedAt: Date;
}

// ============================================
// CITY STATE TYPES
// ============================================

// District types determine which bonuses a building provides
export type DistrictType = 'COMMERCIAL' | 'ENTERTAINMENT' | 'PERFORMANCE';

// District bonuses multipliers
export interface DistrictBonuses {
  incomeMult: number;     // COMMERCIAL: Boosts budget/revenue
  fanMult: number;        // ENTERTAINMENT: Boosts pride & attendance
  trainingMult: number;   // PERFORMANCE: Boosts player XP & recovery
}

// Default bonuses (no buildings)
export const DEFAULT_DISTRICT_BONUSES: DistrictBonuses = {
  incomeMult: 1.0,
  fanMult: 1.0,
  trainingMult: 1.0,
};

// Building configuration with district effects
export interface BuildingConfig {
  type: BuildingType;
  district: DistrictType;
  baseBonus: number;           // Base bonus when state = 2 (Open)
  expandedBonus: number;       // Bonus when state = 3 (Expanded)
  landmarkBonus: number;       // Bonus when state = 4 (Landmark)
}

// Building district mappings and effect values
export const BUILDING_DISTRICT_CONFIG: Record<BuildingType, BuildingConfig> = {
  restaurant: {
    type: 'restaurant',
    district: 'ENTERTAINMENT',
    baseBonus: 0.02,      // +2% fan bonus when open
    expandedBonus: 0.04,  // +4% when expanded
    landmarkBonus: 0.08,  // +8% when landmark
  },
  bar: {
    type: 'bar',
    district: 'ENTERTAINMENT',
    baseBonus: 0.025,
    expandedBonus: 0.05,
    landmarkBonus: 0.10,
  },
  retail: {
    type: 'retail',
    district: 'COMMERCIAL',
    baseBonus: 0.02,      // +2% income bonus when open
    expandedBonus: 0.04,
    landmarkBonus: 0.08,
  },
  hotel: {
    type: 'hotel',
    district: 'COMMERCIAL',
    baseBonus: 0.05,      // +5% income bonus (hotels are valuable)
    expandedBonus: 0.08,
    landmarkBonus: 0.15,
  },
  corporate: {
    type: 'corporate',
    district: 'PERFORMANCE',
    baseBonus: 0.03,      // +3% training bonus
    expandedBonus: 0.06,
    landmarkBonus: 0.12,
  },
};

export interface Building {
  id: number;           // 0-49
  type: BuildingType;
  state: BuildingState;
  name: string | null;  // Named when state >= 2
  yearOpened: number | null;
  district: DistrictType; // District type for bonus calculation
}

export interface CityState {
  id: string;
  gameId: string;

  // Demographics
  population: number;
  medianIncome: number;
  unemploymentRate: number;

  // Pride & Recognition
  teamPride: number;         // 0-100
  nationalRecognition: number; // 0-100

  // Buildings (50 total)
  buildings: Building[];
  occupancyRate: number;  // Calculated: buildings with state >= 2 / 50

  // District Bonuses (calculated from active buildings)
  districtBonuses: DistrictBonuses;

  updatedAt: Date;
}

// ============================================
// DRAFT TYPES
// ============================================

export interface Draft {
  id: string;
  gameId: string;
  year: number;

  // State
  currentRound: number;
  currentPick: number;
  isComplete: boolean;

  // Configuration
  totalRounds: number;      // 40
  teamsCount: number;       // 20
  playersPerRound: number;  // 20

  // Player Order
  playerDraftPosition: number;  // 1-20

  createdAt: Date;
  updatedAt: Date;
}

export interface DraftPick {
  id: string;
  draftId: string;
  gameId: string;

  round: number;
  pickNumber: number;      // Overall pick number
  pickInRound: number;     // Pick within round (1-20)

  teamId: string;          // 'player' or AI team ID
  playerId: string;

  createdAt: Date;
}

export interface ScoutingReport {
  id: string;
  gameId: string;
  prospectId: string;

  // Scouted Values
  scoutedRating: number;
  scoutedPotential: number;
  accuracy: ScoutingTier;
  ratingError: number;      // Actual error amount

  // Hidden trait discovery
  traitsRevealed: boolean;
  revealedTraits: Partial<HiddenTraits>;

  // Cost
  cost: number;
  year: number;

  createdAt: Date;
}

// ============================================
// SEASON & FINANCE TYPES
// ============================================

export interface Season {
  id: string;
  gameId: string;
  year: number;
  tier: Tier;

  // Record
  wins: number;
  losses: number;
  winPct: number;

  // Standings
  divisionRank: number;
  madePlayoffs: boolean;
  wonDivision: boolean;
  wonChampionship: boolean;
  wonWorldSeries: boolean;

  // Attendance
  totalAttendance: number;
  avgAttendance: number;
  gamesPlayed: number;  // Usually 140-162 depending on tier

  createdAt: Date;
}

export interface Finances {
  id: string;
  gameId: string;
  year: number;

  // Revenue
  ticketRevenue: number;
  concessionRevenue: number;
  parkingRevenue: number;
  merchandiseRevenue: number;
  sponsorshipRevenue: number;
  totalRevenue: number;

  // Expenses
  playerSalaries: number;
  coachingSalaries: number;
  stadiumMaintenance: number;
  travelCosts: number;
  marketingCosts: number;
  debtService: number;
  totalExpenses: number;

  // Net
  netIncome: number;
  endingReserves: number;

  createdAt: Date;
}

// ============================================
// AI TEAM TYPES
// ============================================

export interface AITeam {
  id: string;
  name: string;
  city: string;
  abbreviation: string;

  // Draft Strategy
  philosophy: DraftStrategy;
  riskTolerance: number;  // 0-100

  // Position Needs (higher = more need)
  needs: {
    position: Position;
    priority: number;  // 0-100
  }[];

  // For simulation
  baseStrength: number;  // 40-60
  varianceMultiplier: number;
}

// ============================================
// GAME EVENT TYPES
// ============================================

export type GameEventType =
  | 'economic_milestone'
  | 'stadium_moment'
  | 'player_legacy'
  | 'setback'
  | 'promotion'
  | 'bankruptcy_warning'
  | 'city_growth';

export interface GameEvent {
  id: string;
  gameId: string;
  year: number;
  type: GameEventType;
  title: string;
  description: string;

  // Effects (optional)
  effects: {
    prideChange?: number;
    populationChange?: number;
    incomeChange?: number;
    revenueChange?: number;
    recognitionChange?: number;
  } | null;

  // Related entities
  playerId?: string;
  buildingId?: number;

  isRead: boolean;
  createdAt: Date;
}

// ============================================
// SIMULATION RESULT TYPES
// ============================================

export interface PlayerGrowthResult {
  playerId: string;
  previousRating: number;
  newRating: number;
  ratingChange: number;

  // Breakdown
  baseGrowth: number;
  ageModifier: number;
  coachingModifier: number;
  playingTimeModifier: number;
  tierAppropriatenessModifier: number;
  workEthicModifier: number;
  injuryModifier: number;
  randomVariance: number;
}

export interface SeasonSimulationResult {
  wins: number;
  losses: number;
  winPct: number;

  divisionRank: number;
  madePlayoffs: boolean;
  wonDivision: boolean;
  wonChampionship: boolean;
  wonWorldSeries: boolean;

  avgAttendance: number;
  totalAttendance: number;

  playerGrowthResults: PlayerGrowthResult[];
}

export interface FinancialSimulationResult {
  revenue: {
    tickets: number;
    concessions: number;
    parking: number;
    merchandise: number;
    sponsorships: number;
    total: number;
  };

  expenses: {
    playerSalaries: number;
    coachingSalaries: number;
    stadiumMaintenance: number;
    travel: number;
    marketing: number;
    debtService: number;
    total: number;
  };

  netIncome: number;
  newReserves: number;
  debtLevel: number;
  bankruptcyRisk: 'none' | 'warning' | 'critical' | 'imminent';
}

export interface CityGrowthResult {
  buildingsUpgraded: number;
  newPopulation: number;
  newMedianIncome: number;
  newUnemploymentRate: number;
  newPride: number;
  newRecognition: number;

  // District bonuses calculated from all active buildings
  districtBonuses: DistrictBonuses;

  buildingChanges: {
    buildingId: number;
    previousState: BuildingState;
    newState: BuildingState;
    newName?: string;
    newType?: BuildingType;
    newDistrict?: DistrictType;
  }[];

  events: Omit<GameEvent, 'id' | 'gameId' | 'createdAt'>[];
}

// ============================================
// SCOUTING CONFIGURATION
// ============================================

export const SCOUTING_CONFIG: Record<ScoutingTier, {
  cost: number;
  ratingError: number;
  traitDiscoveryChance: number;
}> = {
  low: {
    cost: 2000,
    ratingError: 15,
    traitDiscoveryChance: 0.3,
  },
  medium: {
    cost: 4000,
    ratingError: 8,
    traitDiscoveryChance: 0.6,
  },
  high: {
    cost: 8000,
    ratingError: 3,
    traitDiscoveryChance: 0.9,
  },
};

// ============================================
// DRAFT PROSPECT DISTRIBUTION
// ============================================

export const PROSPECT_DISTRIBUTION = {
  elite: {
    percentage: 0.06,
    potentialRange: { min: 65, max: 75 },
    currentRange: { min: 50, max: 65 },
  },
  good: {
    percentage: 0.19,
    potentialRange: { min: 55, max: 65 },
    currentRange: { min: 45, max: 55 },
  },
  average: {
    percentage: 0.37,
    potentialRange: { min: 45, max: 55 },
    currentRange: { min: 40, max: 50 },
  },
  longshot: {
    percentage: 0.38,
    potentialRange: { min: 35, max: 45 },
    currentRange: { min: 30, max: 40 },
  },
};

// ============================================
// NEWS STORY TYPES (Dynamic Narrative Engine)
// ============================================

export type NewsStoryType = 'GAME_RESULT' | 'MILESTONE' | 'TRANSACTION' | 'CITY';

export type NewsPriority = 'HIGH' | 'LOW';

export interface NewsStory {
  id: string;
  date: string;           // ISO date string
  headline: string;
  type: NewsStoryType;
  priority: NewsPriority;
  imageIcon?: string;     // Optional emoji or icon identifier
  year: number;
  gameNumber?: number;    // For game-related stories
  playerId?: string;      // For player-related stories
  playerName?: string;    // Denormalized for display
}

// Player game performance for headline generation
export interface PlayerGamePerformance {
  playerId: string;
  playerName: string;
  playerType: PlayerType;
  // Batter stats
  hits?: number;
  homeRuns?: number;
  rbi?: number;
  walks?: number;
  strikeouts?: number;
  // Pitcher stats
  inningsPitched?: number;
  earnedRuns?: number;
  pitcherStrikeouts?: number;
  pitcherWalks?: number;
  hitsAllowed?: number;
  isWin?: boolean;
  isLoss?: boolean;
  isSave?: boolean;
}

// Game result for headline generation
export interface GameResultData {
  gameNumber: number;
  isWin: boolean;
  isHome: boolean;
  runsScored: number;
  runsAllowed: number;
  winStreak: number;
  lossStreak: number;
  playerPerformances: PlayerGamePerformance[];
}

// City event for headline generation
export interface CityEventData {
  type: 'DISTRICT_UPGRADE' | 'POPULATION_MILESTONE' | 'BUILDING_LANDMARK' | 'PRIDE_MILESTONE';
  districtType?: DistrictType;
  buildingName?: string;
  milestone?: number;
}

// ============================================
// AI TEAMS DATA
// ============================================

export const AI_TEAMS: AITeam[] = [
  // Aggressive Competitors
  {
    id: 'steel-city-hammers',
    name: 'Hammers',
    city: 'Steel City',
    abbreviation: 'SCH',
    philosophy: 'best_available',
    riskTolerance: 70,
    needs: [],
    baseStrength: 52,
    varianceMultiplier: 1.0,
  },
  {
    id: 'river-city-rapids',
    name: 'Rapids',
    city: 'River City',
    abbreviation: 'RCR',
    philosophy: 'upside_swing',
    riskTolerance: 80,
    needs: [],
    baseStrength: 48,
    varianceMultiplier: 1.3,
  },
  {
    id: 'canyon-town-coyotes',
    name: 'Coyotes',
    city: 'Canyon Town',
    abbreviation: 'CTC',
    philosophy: 'upside_swing',
    riskTolerance: 85,
    needs: [],
    baseStrength: 45,
    varianceMultiplier: 1.4,
  },
  // Conservative Builders
  {
    id: 'port-city-sailors',
    name: 'Sailors',
    city: 'Port City',
    abbreviation: 'PCS',
    philosophy: 'safe_floor',
    riskTolerance: 30,
    needs: [],
    baseStrength: 50,
    varianceMultiplier: 0.8,
  },
  {
    id: 'forest-city-foresters',
    name: 'Foresters',
    city: 'Forest City',
    abbreviation: 'FCF',
    philosophy: 'safe_floor',
    riskTolerance: 25,
    needs: [],
    baseStrength: 51,
    varianceMultiplier: 0.7,
  },
  {
    id: 'valley-town-vultures',
    name: 'Vultures',
    city: 'Valley Town',
    abbreviation: 'VTV',
    philosophy: 'safe_floor',
    riskTolerance: 20,
    needs: [],
    baseStrength: 49,
    varianceMultiplier: 0.75,
  },
  // Need-Based Teams
  {
    id: 'coaltown-miners',
    name: 'Miners',
    city: 'Coaltown',
    abbreviation: 'CTM',
    philosophy: 'need_based',
    riskTolerance: 50,
    needs: [
      { position: 'SP', priority: 90 },
      { position: 'RP', priority: 70 },
    ],
    baseStrength: 47,
    varianceMultiplier: 1.0,
  },
  {
    id: 'mountain-town-mountaineers',
    name: 'Mountaineers',
    city: 'Mountain Town',
    abbreviation: 'MTM',
    philosophy: 'need_based',
    riskTolerance: 50,
    needs: [
      { position: 'C', priority: 85 },
      { position: '1B', priority: 60 },
    ],
    baseStrength: 48,
    varianceMultiplier: 1.0,
  },
  {
    id: 'desert-springs-scorpions',
    name: 'Scorpions',
    city: 'Desert Springs',
    abbreviation: 'DSS',
    philosophy: 'need_based',
    riskTolerance: 55,
    needs: [
      { position: 'CF', priority: 80 },
      { position: 'LF', priority: 65 },
      { position: 'RF', priority: 65 },
    ],
    baseStrength: 46,
    varianceMultiplier: 1.0,
  },
  // Wildcards
  {
    id: 'lakeside-lakers',
    name: 'Lakers',
    city: 'Lakeside',
    abbreviation: 'LSL',
    philosophy: 'upside_swing',
    riskTolerance: 60,
    needs: [],
    baseStrength: 50,
    varianceMultiplier: 1.2,
  },
  {
    id: 'bay-city-buccaneers',
    name: 'Buccaneers',
    city: 'Bay City',
    abbreviation: 'BCB',
    philosophy: 'best_available',
    riskTolerance: 45,
    needs: [],
    baseStrength: 53,
    varianceMultiplier: 0.9,
  },
  // Additional teams to reach 19
  {
    id: 'prairie-plains-pioneers',
    name: 'Pioneers',
    city: 'Prairie Plains',
    abbreviation: 'PPP',
    philosophy: 'best_available',
    riskTolerance: 55,
    needs: [],
    baseStrength: 49,
    varianceMultiplier: 1.0,
  },
  {
    id: 'summit-heights-hawks',
    name: 'Hawks',
    city: 'Summit Heights',
    abbreviation: 'SHH',
    philosophy: 'upside_swing',
    riskTolerance: 65,
    needs: [],
    baseStrength: 47,
    varianceMultiplier: 1.1,
  },
  {
    id: 'riverside-royals',
    name: 'Royals',
    city: 'Riverside',
    abbreviation: 'RSR',
    philosophy: 'safe_floor',
    riskTolerance: 35,
    needs: [],
    baseStrength: 52,
    varianceMultiplier: 0.85,
  },
  {
    id: 'crossroads-cardinals',
    name: 'Cardinals',
    city: 'Crossroads',
    abbreviation: 'CRC',
    philosophy: 'need_based',
    riskTolerance: 50,
    needs: [
      { position: 'SS', priority: 75 },
      { position: '2B', priority: 70 },
    ],
    baseStrength: 50,
    varianceMultiplier: 1.0,
  },
  {
    id: 'ironworks-ironmen',
    name: 'Ironmen',
    city: 'Ironworks',
    abbreviation: 'IWI',
    philosophy: 'best_available',
    riskTolerance: 60,
    needs: [],
    baseStrength: 51,
    varianceMultiplier: 1.0,
  },
  {
    id: 'harbor-town-hurricanes',
    name: 'Hurricanes',
    city: 'Harbor Town',
    abbreviation: 'HTH',
    philosophy: 'upside_swing',
    riskTolerance: 75,
    needs: [],
    baseStrength: 46,
    varianceMultiplier: 1.25,
  },
  {
    id: 'metro-city-meteors',
    name: 'Meteors',
    city: 'Metro City',
    abbreviation: 'MCM',
    philosophy: 'safe_floor',
    riskTolerance: 40,
    needs: [],
    baseStrength: 54,
    varianceMultiplier: 0.8,
  },
  {
    id: 'central-valley-condors',
    name: 'Condors',
    city: 'Central Valley',
    abbreviation: 'CVC',
    philosophy: 'need_based',
    riskTolerance: 45,
    needs: [
      { position: '3B', priority: 80 },
      { position: 'DH', priority: 50 },
    ],
    baseStrength: 48,
    varianceMultiplier: 1.0,
  },
];

// ============================================
// BOX SCORE TYPES (Game Results)
// ============================================

export interface BatterBoxScore {
  playerId: string;
  name: string;
  position: Position;
  battingOrder: number;
  ab: number;       // At-bats
  r: number;        // Runs
  h: number;        // Hits
  doubles: number;  // 2B
  triples: number;  // 3B
  hr: number;       // Home runs
  rbi: number;      // Runs batted in
  bb: number;       // Walks
  so: number;       // Strikeouts
  sb: number;       // Stolen bases
  avg: number;      // Batting average this game
}

export interface PitcherBoxScore {
  playerId: string;
  name: string;
  ip: number;       // Innings pitched (e.g., 6.2)
  h: number;        // Hits allowed
  r: number;        // Runs allowed
  er: number;       // Earned runs
  bb: number;       // Walks
  so: number;       // Strikeouts
  hr: number;       // Home runs allowed
  pitchCount: number;
  strikes: number;
  isWin: boolean;
  isLoss: boolean;
  isSave: boolean;
  isHold: boolean;
  era: number;      // ERA for this game
}

export interface GameResult {
  id: string;
  gameId: string;
  seasonId: string;
  year: number;
  gameNumber: number;

  // Teams
  playerTeamName: string;
  opponentName: string;
  isHome: boolean;

  // Final Score
  playerRuns: number;
  opponentRuns: number;
  isWin: boolean;

  // Line Score (inning by inning)
  playerLineScore: number[];  // [0, 1, 0, 2, 0, 0, 3, 0, 1]
  opponentLineScore: number[];

  // Team Totals
  playerHits: number;
  playerErrors: number;
  opponentHits: number;
  opponentErrors: number;

  // Detailed Stats
  battingStats: BatterBoxScore[];
  pitchingStats: PitcherBoxScore[];

  // Metadata
  attendance: number;
  gameDurationMinutes?: number;
  weather?: string;

  createdAt: Date;
}

export interface GameLogEntry {
  id: string;
  gameNumber: number;
  isHome: boolean;
  opponentName: string;
  playerRuns: number;
  opponentRuns: number;
  isWin: boolean;
  playerHits: number;
  playerErrors: number;
  opponentHits: number;
  opponentErrors: number;
  attendance: number;
  createdAt: Date;
}

// ============================================
// PLAYOFF TYPES
// ============================================

export type PlayoffStatus = 'pending' | 'semifinals' | 'finals' | 'complete';
export type SeriesStatus = 'pending' | 'in_progress' | 'complete';
export type PlayoffRound = 'semifinals' | 'finals';

export interface PlayoffTeam {
  id: string; // 'player' or AI team id
  name: string;
  seed: number;
  wins: number;
  losses: number;
  winPct: number;
}

export interface PlayoffGame {
  id: string;
  seriesId: string;
  gameNumber: number;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number | null;
  awayScore: number | null;
  winnerId: string | null;
  isComplete: boolean;
  homeLineScore: number[];
  awayLineScore: number[];
  attendance: number;
}

export interface PlayoffSeries {
  id: string;
  bracketId: string;
  round: PlayoffRound;
  seriesNumber: number;
  team1: PlayoffTeam;
  team2: PlayoffTeam;
  team1Wins: number;
  team2Wins: number;
  status: SeriesStatus;
  winnerId: string | null;
  winnerName: string | null;
  games: PlayoffGame[];
}

export interface PlayoffBracket {
  id: string;
  gameId: string;
  seasonId: string;
  year: number;
  status: PlayoffStatus;
  championTeamId: string | null;
  championTeamName: string | null;
  semifinals: PlayoffSeries[];
  finals: PlayoffSeries | null;
}
