// ============================================
// City Growth Simulation Engine
// Building evolution and city transformation
// ============================================

import type {
  Building,
  BuildingState,
  BuildingType,
  CityState,
  CityGrowthResult,
  GameEvent,
  Tier,
} from '@/lib/types';

// ============================================
// CONFIGURATION
// ============================================

const CITY_CONFIG = {
  TOTAL_BUILDINGS: 50,

  // Building type distribution for new openings
  BUILDING_TYPE_WEIGHTS: {
    restaurant: 0.30,
    bar: 0.20,
    retail: 0.25,
    hotel: 0.15,
    corporate: 0.10,
  } as Record<BuildingType, number>,

  // Minimum tier for certain building types
  BUILDING_TIER_REQUIREMENTS: {
    restaurant: 'LOW_A' as Tier,
    bar: 'LOW_A' as Tier,
    retail: 'LOW_A' as Tier,
    hotel: 'HIGH_A' as Tier,
    corporate: 'DOUBLE_A' as Tier,
  },

  // Growth rate modifiers
  SUCCESS_SCORE_DIVISOR: 20,  // buildingsToUpgrade = floor(successScore / 20)

  // Population growth rates per tier (base annual growth)
  POPULATION_GROWTH: {
    LOW_A: { base: 500, perWinPct: 200, perPride: 100 },
    HIGH_A: { base: 1000, perWinPct: 400, perPride: 200 },
    DOUBLE_A: { base: 2000, perWinPct: 800, perPride: 400 },
    TRIPLE_A: { base: 4000, perWinPct: 1500, perPride: 750 },
    MLB: { base: 8000, perWinPct: 3000, perPride: 1500 },
  } as Record<Tier, { base: number; perWinPct: number; perPride: number }>,

  // Income growth per tier (annual increase potential)
  INCOME_GROWTH: {
    LOW_A: { base: 500, perOccupancy: 20 },
    HIGH_A: { base: 800, perOccupancy: 30 },
    DOUBLE_A: { base: 1200, perOccupancy: 50 },
    TRIPLE_A: { base: 2000, perOccupancy: 80 },
    MLB: { base: 3000, perOccupancy: 120 },
  } as Record<Tier, { base: number; perOccupancy: number }>,

  // Unemployment improvement
  UNEMPLOYMENT_IMPROVEMENT: {
    perBuildingUpgrade: 0.3,
    perSuccessScore: 0.01,
    minimum: 3.0,  // Can't go below 3%
  },

  // Pride changes
  PRIDE: {
    winningSeasonBonus: 5,
    losingSeasonPenalty: -3,
    playoffBonus: 8,
    championshipBonus: 15,
    worldSeriesBonus: 25,
    buildingOpeningBonus: 1,
  },

  // Recognition changes
  RECOGNITION: {
    playoffBonus: 3,
    championshipBonus: 8,
    worldSeriesBonus: 20,
    highAttendanceBonus: 2,  // Per 10% above capacity
    mediaEventBonus: 5,
  },
};

// ============================================
// BUILDING NAME GENERATION
// ============================================

const BUILDING_NAMES: Record<BuildingType, string[]> = {
  restaurant: [
    "The Dugout Grill", "Home Plate Diner", "Seventh Inning Stretch Cafe",
    "The Grand Slam", "Bullpen BBQ", "The Batting Cage Bistro",
    "Curveball Kitchen", "The Fastball Grill", "Diamond Diner",
    "The Rookie's Table", "Bases Loaded Burgers", "Extra Innings Eatery",
  ],
  bar: [
    "The Closer's Pub", "Rally Cap Tavern", "The Press Box Bar",
    "Bleacher Bums", "The Ninth Inning", "Southpaw Saloon",
    "The Bullpen", "Slider's Sports Bar", "The Pinch Hit",
    "Changeup Brewing Co.", "The Double Play", "Foul Line Taphouse",
  ],
  retail: [
    "Team Spirit Shop", "Champions Corner", "The Ballpark Store",
    "Hat Trick Sports", "Jersey Junction", "The Fan Zone",
    "Pennant Plaza", "Trophy Case Collectibles", "Diamond District",
    "Clubhouse Gear", "MVP Memorabilia", "Batting Practice Pro Shop",
  ],
  hotel: [
    "The Grand Slam Inn", "Championship Suites", "Ballpark Plaza Hotel",
    "The Diamond Hotel", "Stadium View Inn", "The Pennant Hotel",
    "Victory Suites", "The Champions Lodge", "Clubhouse Hotel",
  ],
  corporate: [
    "Stadium Square Offices", "Diamond Business Center", "Championship Tower",
    "Victory Corporate Park", "Pennant Plaza Offices", "The Press Box Building",
    "Grand Slam Business Center", "Ballpark Professional Center",
  ],
};

function generateBuildingName(type: BuildingType, existingNames: string[]): string {
  const availableNames = BUILDING_NAMES[type].filter(
    name => !existingNames.includes(name)
  );

  if (availableNames.length === 0) {
    // Fallback to numbered names
    const count = existingNames.filter(n => n.startsWith(type)).length;
    return `${type.charAt(0).toUpperCase() + type.slice(1)} #${count + 1}`;
  }

  return availableNames[Math.floor(Math.random() * availableNames.length)];
}

// ============================================
// BUILDING TYPE SELECTION
// ============================================

function selectBuildingType(tier: Tier): BuildingType {
  const tierOrder: Tier[] = ['LOW_A', 'HIGH_A', 'DOUBLE_A', 'TRIPLE_A', 'MLB'];
  const currentTierIndex = tierOrder.indexOf(tier);

  // Filter available building types based on tier
  const availableTypes = Object.entries(CITY_CONFIG.BUILDING_TIER_REQUIREMENTS)
    .filter(([_, requiredTier]) => {
      const requiredIndex = tierOrder.indexOf(requiredTier);
      return currentTierIndex >= requiredIndex;
    })
    .map(([type]) => type as BuildingType);

  // Calculate weighted random selection
  let totalWeight = 0;
  const weightedTypes: { type: BuildingType; weight: number }[] = [];

  for (const type of availableTypes) {
    const weight = CITY_CONFIG.BUILDING_TYPE_WEIGHTS[type];
    totalWeight += weight;
    weightedTypes.push({ type, weight });
  }

  let random = Math.random() * totalWeight;
  for (const { type, weight } of weightedTypes) {
    random -= weight;
    if (random <= 0) {
      return type;
    }
  }

  return 'retail'; // Fallback
}

// ============================================
// SUCCESS SCORE CALCULATION
// ============================================

export interface SeasonSuccessInput {
  winPct: number;
  attendanceRate: number;  // Attendance / capacity
  madePlayoffs: boolean;
}

/**
 * Calculate success score for the season
 *
 * From PRD:
 * successScore =
 *   (winPct - 0.5) × 100           // -50 to +50
 *   + (attendance/capacity) × 30   // 0 to +30
 *   + (playoffs ? 20 : 0)          // Playoff bonus
 */
export function calculateSuccessScore(input: SeasonSuccessInput): number {
  const { winPct, attendanceRate, madePlayoffs } = input;

  const winComponent = (winPct - 0.5) * 100;
  const attendanceComponent = attendanceRate * 30;
  const playoffComponent = madePlayoffs ? 20 : 0;

  return winComponent + attendanceComponent + playoffComponent;
}

// ============================================
// BUILDING UPGRADES
// ============================================

export interface BuildingUpgrade {
  buildingId: number;
  previousState: BuildingState;
  newState: BuildingState;
  newName?: string;
  newType?: BuildingType;
}

/**
 * Determine which buildings to upgrade
 *
 * Priority order:
 * 1. State 0 → State 1 (Renovations begin)
 * 2. State 1 → State 2 (Grand opening)
 * 3. State 2 → State 3 (Expansion)
 * 4. State 3 → State 4 (Landmark status)
 */
export function determineBuildingUpgrades(
  buildings: Building[],
  upgradeCount: number,
  tier: Tier,
  year: number
): BuildingUpgrade[] {
  const upgrades: BuildingUpgrade[] = [];

  if (upgradeCount <= 0) return upgrades;

  // Get existing names to avoid duplicates
  const existingNames = buildings
    .filter(b => b.name)
    .map(b => b.name!);

  let remainingUpgrades = upgradeCount;

  // Priority 1: Vacant (State 0) → Under Renovation (State 1)
  if (remainingUpgrades > 0) {
    const vacantBuildings = buildings.filter(b => b.state === 0);
    const toRenovate = Math.min(remainingUpgrades, vacantBuildings.length);

    for (let i = 0; i < toRenovate; i++) {
      const building = vacantBuildings[i];
      const newType = selectBuildingType(tier);
      upgrades.push({
        buildingId: building.id,
        previousState: 0,
        newState: 1,
        newType,
      });
      remainingUpgrades--;
    }
  }

  // Priority 2: Under Renovation (State 1) → Open (State 2)
  if (remainingUpgrades > 0) {
    const renovatingBuildings = buildings.filter(b => b.state === 1);
    const toOpen = Math.min(remainingUpgrades, renovatingBuildings.length);

    for (let i = 0; i < toOpen; i++) {
      const building = renovatingBuildings[i];
      const name = generateBuildingName(building.type, existingNames);
      existingNames.push(name);

      upgrades.push({
        buildingId: building.id,
        previousState: 1,
        newState: 2,
        newName: name,
      });
      remainingUpgrades--;
    }
  }

  // Priority 3: Open (State 2) → Expanded (State 3)
  if (remainingUpgrades > 0) {
    const openBuildings = buildings.filter(b => b.state === 2);
    const toExpand = Math.min(remainingUpgrades, openBuildings.length);

    for (let i = 0; i < toExpand; i++) {
      const building = openBuildings[i];
      upgrades.push({
        buildingId: building.id,
        previousState: 2,
        newState: 3,
      });
      remainingUpgrades--;
    }
  }

  // Priority 4: Expanded (State 3) → Landmark (State 4)
  if (remainingUpgrades > 0) {
    const expandedBuildings = buildings.filter(b => b.state === 3);
    const toLandmark = Math.min(remainingUpgrades, expandedBuildings.length);

    for (let i = 0; i < toLandmark; i++) {
      const building = expandedBuildings[i];
      upgrades.push({
        buildingId: building.id,
        previousState: 3,
        newState: 4,
      });
      remainingUpgrades--;
    }
  }

  return upgrades;
}

// ============================================
// CITY METRICS UPDATES
// ============================================

export interface CityMetricsUpdate {
  population: number;
  medianIncome: number;
  unemploymentRate: number;
  teamPride: number;
  nationalRecognition: number;
  occupancyRate: number;
}

/**
 * Calculate updated city metrics
 */
export function calculateCityMetrics(
  currentState: CityState,
  successScore: number,
  buildingsUpgraded: number,
  tier: Tier,
  madePlayoffs: boolean,
  wonChampionship: boolean,
  wonWorldSeries: boolean,
  winPct: number
): CityMetricsUpdate {
  const tierGrowth = CITY_CONFIG.POPULATION_GROWTH[tier];
  const tierIncome = CITY_CONFIG.INCOME_GROWTH[tier];

  // Calculate new population
  const populationGrowth =
    tierGrowth.base +
    (winPct - 0.5) * tierGrowth.perWinPct * 2 +
    (currentState.teamPride / 100) * tierGrowth.perPride;
  const newPopulation = Math.round(currentState.population + populationGrowth);

  // Calculate occupancy rate
  const openBuildings = currentState.buildings.filter(b => b.state >= 2).length;
  const newOccupancyRate = (openBuildings + buildingsUpgraded) / CITY_CONFIG.TOTAL_BUILDINGS;

  // Calculate new median income
  const incomeGrowth =
    tierIncome.base +
    newOccupancyRate * 100 * tierIncome.perOccupancy / 100;
  const newMedianIncome = Math.round(currentState.medianIncome + incomeGrowth);

  // Calculate unemployment improvement
  const unemploymentReduction =
    buildingsUpgraded * CITY_CONFIG.UNEMPLOYMENT_IMPROVEMENT.perBuildingUpgrade +
    Math.max(0, successScore) * CITY_CONFIG.UNEMPLOYMENT_IMPROVEMENT.perSuccessScore;
  const newUnemploymentRate = Math.max(
    CITY_CONFIG.UNEMPLOYMENT_IMPROVEMENT.minimum,
    currentState.unemploymentRate - unemploymentReduction
  );

  // Calculate pride changes
  let prideChange = 0;
  if (winPct >= 0.5) {
    prideChange += CITY_CONFIG.PRIDE.winningSeasonBonus;
  } else {
    prideChange += CITY_CONFIG.PRIDE.losingSeasonPenalty;
  }
  if (madePlayoffs) prideChange += CITY_CONFIG.PRIDE.playoffBonus;
  if (wonChampionship) prideChange += CITY_CONFIG.PRIDE.championshipBonus;
  if (wonWorldSeries) prideChange += CITY_CONFIG.PRIDE.worldSeriesBonus;
  prideChange += buildingsUpgraded * CITY_CONFIG.PRIDE.buildingOpeningBonus;

  const newPride = Math.max(0, Math.min(100, currentState.teamPride + prideChange));

  // Calculate recognition changes
  let recognitionChange = 0;
  if (madePlayoffs) recognitionChange += CITY_CONFIG.RECOGNITION.playoffBonus;
  if (wonChampionship) recognitionChange += CITY_CONFIG.RECOGNITION.championshipBonus;
  if (wonWorldSeries) recognitionChange += CITY_CONFIG.RECOGNITION.worldSeriesBonus;

  const newRecognition = Math.max(
    0,
    Math.min(100, currentState.nationalRecognition + recognitionChange)
  );

  return {
    population: newPopulation,
    medianIncome: newMedianIncome,
    unemploymentRate: newUnemploymentRate,
    teamPride: newPride,
    nationalRecognition: newRecognition,
    occupancyRate: newOccupancyRate,
  };
}

// ============================================
// EVENT GENERATION
// ============================================

/**
 * Generate narrative events based on city growth
 */
export function generateCityEvents(
  buildingChanges: BuildingUpgrade[],
  metricsUpdate: CityMetricsUpdate,
  currentState: CityState,
  tier: Tier,
  year: number,
  wonChampionship: boolean,
  wonWorldSeries: boolean
): Omit<GameEvent, 'id' | 'gameId' | 'createdAt'>[] {
  const events: Omit<GameEvent, 'id' | 'gameId' | 'createdAt'>[] = [];

  // Building opening events
  const newOpenings = buildingChanges.filter(
    b => b.previousState === 1 && b.newState === 2
  );

  for (const opening of newOpenings.slice(0, 2)) {
    // Only generate events for first 2 openings to avoid spam
    events.push({
      year,
      type: 'city_growth',
      title: `${opening.newName} Opens!`,
      description: `A new ${opening.newType || 'business'} has opened near the stadium, citing gameday foot traffic as a major factor.`,
      effects: { prideChange: 1 },
      buildingId: opening.buildingId,
      isRead: false,
    });
  }

  // Landmark events
  const newLandmarks = buildingChanges.filter(
    b => b.previousState === 3 && b.newState === 4
  );

  for (const landmark of newLandmarks) {
    events.push({
      year,
      type: 'city_growth',
      title: 'Historic Landmark Designation',
      description: `A local business has achieved landmark status, becoming a permanent fixture of the community.`,
      effects: { prideChange: 3, recognitionChange: 2 },
      buildingId: landmark.buildingId,
      isRead: false,
    });
  }

  // Milestone events
  const newOccupancy = metricsUpdate.occupancyRate * 100;
  const oldOccupancy = currentState.occupancyRate * 100;

  // 50% occupancy milestone
  if (oldOccupancy < 50 && newOccupancy >= 50) {
    events.push({
      year,
      type: 'economic_milestone',
      title: 'Downtown Revival!',
      description: 'Half of the downtown buildings are now occupied. The city is showing clear signs of recovery.',
      effects: { prideChange: 5 },
      isRead: false,
    });
  }

  // 75% occupancy milestone
  if (oldOccupancy < 75 && newOccupancy >= 75) {
    events.push({
      year,
      type: 'economic_milestone',
      title: 'Economic Boom',
      description: 'The downtown district is thriving! New businesses are eager to open locations near the stadium.',
      effects: { prideChange: 8, recognitionChange: 5 },
      isRead: false,
    });
  }

  // 90% occupancy milestone
  if (oldOccupancy < 90 && newOccupancy >= 90) {
    events.push({
      year,
      type: 'economic_milestone',
      title: 'City Transformed',
      description: 'What was once a struggling town is now a vibrant community. Your team has changed everything.',
      effects: { prideChange: 15, recognitionChange: 10 },
      isRead: false,
    });
  }

  // Population milestones
  if (currentState.population < 50000 && metricsUpdate.population >= 50000) {
    events.push({
      year,
      type: 'economic_milestone',
      title: 'Population Milestone',
      description: 'The city has grown to 50,000 residents! Regional companies are taking notice.',
      effects: { populationChange: 0 },
      isRead: false,
    });
  }

  if (currentState.population < 100000 && metricsUpdate.population >= 100000) {
    events.push({
      year,
      type: 'economic_milestone',
      title: 'Major City Status',
      description: 'With 100,000 residents, the city is now considered a major regional hub.',
      effects: { recognitionChange: 10 },
      isRead: false,
    });
  }

  // Championship events
  if (wonWorldSeries) {
    events.push({
      year,
      type: 'stadium_moment',
      title: 'World Champions!',
      description: 'The city erupts in celebration! Championship parade draws fans from across the region.',
      effects: { prideChange: 25, recognitionChange: 20 },
      isRead: false,
    });
  } else if (wonChampionship) {
    events.push({
      year,
      type: 'stadium_moment',
      title: 'League Champions!',
      description: 'Championship celebration rocks the city! Momentum building for the next level.',
      effects: { prideChange: 15, recognitionChange: 8 },
      isRead: false,
    });
  }

  return events;
}

// ============================================
// FULL CITY GROWTH SIMULATION
// ============================================

export interface CityGrowthInput {
  currentState: CityState;
  tier: Tier;
  year: number;
  winPct: number;
  attendanceRate: number;
  madePlayoffs: boolean;
  wonChampionship: boolean;
  wonWorldSeries: boolean;
}

/**
 * Run complete city growth simulation
 */
export function simulateCityGrowth(input: CityGrowthInput): CityGrowthResult {
  const {
    currentState,
    tier,
    year,
    winPct,
    attendanceRate,
    madePlayoffs,
    wonChampionship,
    wonWorldSeries,
  } = input;

  // 1. Calculate success score
  const successScore = calculateSuccessScore({
    winPct,
    attendanceRate,
    madePlayoffs,
  });

  // 2. Determine number of buildings to upgrade
  const buildingsToUpgrade = Math.max(0, Math.floor(successScore / CITY_CONFIG.SUCCESS_SCORE_DIVISOR));

  // 3. Determine specific building upgrades
  const buildingUpgrades = determineBuildingUpgrades(
    currentState.buildings,
    buildingsToUpgrade,
    tier,
    year
  );

  // 4. Calculate updated city metrics
  const metricsUpdate = calculateCityMetrics(
    currentState,
    successScore,
    buildingUpgrades.length,
    tier,
    madePlayoffs,
    wonChampionship,
    wonWorldSeries,
    winPct
  );

  // 5. Generate narrative events
  const events = generateCityEvents(
    buildingUpgrades,
    metricsUpdate,
    currentState,
    tier,
    year,
    wonChampionship,
    wonWorldSeries
  );

  return {
    buildingsUpgraded: buildingUpgrades.length,
    newPopulation: metricsUpdate.population,
    newMedianIncome: metricsUpdate.medianIncome,
    newUnemploymentRate: metricsUpdate.unemploymentRate,
    newPride: metricsUpdate.teamPride,
    newRecognition: metricsUpdate.nationalRecognition,

    buildingChanges: buildingUpgrades,
    events,
  };
}

// ============================================
// INITIAL CITY GENERATION
// ============================================

/**
 * Generate initial city state with 50 buildings
 * Starting state: 60% vacant (State 0), 40% in various states
 */
export function generateInitialCity(): Building[] {
  const buildings: Building[] = [];

  for (let i = 0; i < CITY_CONFIG.TOTAL_BUILDINGS; i++) {
    // 60% vacant, 30% state 1-2, 10% state 2-3
    let state: BuildingState;
    const roll = Math.random();

    if (roll < 0.60) {
      state = 0;  // Vacant
    } else if (roll < 0.85) {
      state = 1;  // Under renovation
    } else if (roll < 0.95) {
      state = 2;  // Open
    } else {
      state = 3;  // Expanded
    }

    const type = state > 0 ? selectBuildingType('LOW_A') : 'retail';

    buildings.push({
      id: i,
      type,
      state,
      name: null,  // Names assigned when state reaches 2
      yearOpened: null,
    });
  }

  return buildings;
}
