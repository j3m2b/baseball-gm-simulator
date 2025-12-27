// ============================================
// Narrative Event Engine
// Generates story events based on game state
// ============================================

import type { Tier } from '@/lib/types';

// ============================================
// TYPES
// ============================================

export type EventType = 'economic' | 'team' | 'city' | 'story';

export interface GameState {
  gameId: string;
  year: number;
  tier: Tier;

  // Season results
  wins: number;
  losses: number;
  winPercentage: number;
  madePlayoffs: boolean;
  wonDivision: boolean;

  // City state
  population: number;
  unemploymentRate: number;
  teamPride: number;
  medianIncome: number;

  // Franchise state
  stadiumQuality: number;
  reserves: number;
  totalAttendance: number;
  stadiumCapacity: number;

  // Historical context
  consecutiveWinningSeasons: number;
  consecutiveDivisionTitles: number;
}

export interface NarrativeEvent {
  type: EventType;
  title: string;
  description: string;
  effects: EventEffects;
  durationYears?: number; // How long the effect lasts
}

export interface EventEffects {
  attendanceModifier?: number;      // Multiplier (0.85 = -15%)
  revenueModifier?: number;         // Multiplier for total revenue
  merchandiseModifier?: number;     // Multiplier for merchandise
  prideChange?: number;             // +/- to team pride
  populationChange?: number;        // +/- to population
  stadiumQualityChange?: number;    // +/- to stadium quality
  moraleChange?: number;            // +/- to all player morale
  maintenanceCost?: number;         // One-time cost
}

// ============================================
// EVENT DEFINITIONS
// ============================================

const ECONOMIC_EVENTS = {
  factoryClosure: {
    type: 'economic' as EventType,
    title: 'Factory Closure Rocks City',
    description: 'The largest employer in town has announced layoffs, hitting the local economy hard. Fans are tightening their belts, and attendance is expected to drop.',
    effects: {
      attendanceModifier: 0.85, // -15% attendance
      prideChange: -5,
      populationChange: -500,
    },
    durationYears: 2,
  },
  economicBoom: {
    type: 'economic' as EventType,
    title: 'New Business Opens Downtown',
    description: 'A major company has chosen our city for their new headquarters! Jobs are flowing in and the economy is booming.',
    effects: {
      attendanceModifier: 1.10, // +10% attendance
      prideChange: 5,
      populationChange: 1000,
      revenueModifier: 1.05,
    },
    durationYears: 3,
  },
  recessionWarning: {
    type: 'economic' as EventType,
    title: 'Economic Uncertainty Looms',
    description: 'Local economists are warning of a potential downturn. Discretionary spending is already showing signs of decline.',
    effects: {
      merchandiseModifier: 0.90,
      attendanceModifier: 0.95,
    },
    durationYears: 1,
  },
};

const TEAM_EVENTS = {
  cityFever: {
    type: 'team' as EventType,
    title: 'City Catches Baseball Fever!',
    description: 'The team\'s winning ways have captured the city\'s imagination! Merchandise is flying off the shelves and everyone is talking about the team.',
    effects: {
      merchandiseModifier: 1.25, // +25% merchandise revenue
      prideChange: 10,
      attendanceModifier: 1.15,
    },
    durationYears: 1,
  },
  playoffPush: {
    type: 'team' as EventType,
    title: 'Playoff Push Ignites Fanbase',
    description: 'With a playoff berth on the line, the city has rallied behind the team. Late-season attendance is through the roof!',
    effects: {
      attendanceModifier: 1.20,
      merchandiseModifier: 1.15,
      prideChange: 8,
    },
    durationYears: 1,
  },
  losingSkid: {
    type: 'team' as EventType,
    title: 'Fans Growing Restless',
    description: 'A disappointing season has fans questioning the direction of the franchise. Attendance has started to slip.',
    effects: {
      attendanceModifier: 0.90,
      prideChange: -8,
      moraleChange: -10,
    },
    durationYears: 1,
  },
  starBreakout: {
    type: 'team' as EventType,
    title: 'Homegrown Star Emerges',
    description: 'A player from our own development system has broken out into stardom! The whole city is talking about our future.',
    effects: {
      prideChange: 12,
      merchandiseModifier: 1.20,
      moraleChange: 15,
    },
    durationYears: 1,
  },
};

const CITY_EVENTS = {
  stadiumDecay: {
    type: 'city' as EventType,
    title: 'Stadium Shows Its Age',
    description: 'Maintenance crews have reported significant wear on stadium infrastructure. Immediate repairs are needed to keep the facility safe.',
    effects: {
      stadiumQualityChange: -8,
      maintenanceCost: 50000,
      attendanceModifier: 0.95,
    },
    durationYears: 0, // Immediate, one-time
  },
  stadiumRenovation: {
    type: 'city' as EventType,
    title: 'Stadium Renovation Complete',
    description: 'The recently completed stadium upgrades have fans buzzing! New amenities and improved sightlines are drawing praise.',
    effects: {
      stadiumQualityChange: 15,
      attendanceModifier: 1.10,
      prideChange: 5,
    },
    durationYears: 2,
  },
  communityDay: {
    type: 'city' as EventType,
    title: 'Community Appreciation Day Success',
    description: 'The team\'s community outreach program has strengthened ties with local residents. Goodwill is at an all-time high.',
    effects: {
      prideChange: 8,
      attendanceModifier: 1.05,
    },
    durationYears: 1,
  },
};

const STORY_EVENTS = {
  dynastyBuilding: {
    type: 'story' as EventType,
    title: 'A Dynasty in the Making',
    description: 'Sports writers are calling this the start of something special. Multiple winning seasons have put the franchise on the national radar.',
    effects: {
      prideChange: 15,
      merchandiseModifier: 1.30,
      attendanceModifier: 1.15,
    },
    durationYears: 2,
  },
  darkDays: {
    type: 'story' as EventType,
    title: 'Dark Days for the Franchise',
    description: 'Years of losing have taken their toll. The few remaining loyal fans wonder if better days will ever come.',
    effects: {
      prideChange: -15,
      attendanceModifier: 0.80,
      moraleChange: -15,
    },
    durationYears: 1,
  },
  turnaroundBegins: {
    type: 'story' as EventType,
    title: 'The Turnaround Begins',
    description: 'After years of struggle, there\'s finally hope. This winning season has renewed faith in the franchise\'s future.',
    effects: {
      prideChange: 12,
      moraleChange: 20,
      attendanceModifier: 1.10,
    },
    durationYears: 1,
  },
};

// ============================================
// EVENT CHECKING LOGIC
// ============================================

/**
 * Check for narrative events based on current game state
 * Called after each season completes
 */
export function checkForEvents(gameState: GameState): NarrativeEvent[] {
  const events: NarrativeEvent[] = [];

  // ============================================
  // ECONOMIC TRIGGERS
  // ============================================

  // Factory Closure: High unemployment
  if (gameState.unemploymentRate > 12) {
    // 40% chance if unemployment is high
    if (Math.random() < 0.40) {
      events.push(ECONOMIC_EVENTS.factoryClosure);
    }
  }

  // Economic Boom: Low unemployment + high pride
  if (gameState.unemploymentRate < 6 && gameState.teamPride > 60) {
    if (Math.random() < 0.25) {
      events.push(ECONOMIC_EVENTS.economicBoom);
    }
  }

  // Recession Warning: Moderate unemployment increasing
  if (gameState.unemploymentRate > 8 && gameState.unemploymentRate <= 12) {
    if (Math.random() < 0.20) {
      events.push(ECONOMIC_EVENTS.recessionWarning);
    }
  }

  // ============================================
  // TEAM TRIGGERS
  // ============================================

  // City Fever (Bandwagon Effect): Winning team
  if (gameState.winPercentage > 0.600) {
    // Higher chance with better record
    const chance = 0.30 + (gameState.winPercentage - 0.600) * 2;
    if (Math.random() < chance) {
      events.push(TEAM_EVENTS.cityFever);
    }
  }

  // Playoff Push: Good record + made playoffs
  if (gameState.madePlayoffs && gameState.winPercentage > 0.550) {
    if (Math.random() < 0.50) {
      events.push(TEAM_EVENTS.playoffPush);
    }
  }

  // Losing Skid: Poor record
  if (gameState.winPercentage < 0.400) {
    if (Math.random() < 0.35) {
      events.push(TEAM_EVENTS.losingSkid);
    }
  }

  // Star Breakout: Winning + good morale (approximated by pride)
  if (gameState.winPercentage > 0.550 && gameState.teamPride > 50) {
    if (Math.random() < 0.15) {
      events.push(TEAM_EVENTS.starBreakout);
    }
  }

  // ============================================
  // CITY/STADIUM TRIGGERS
  // ============================================

  // Stadium Decay: 5% base chance, higher with low quality
  const decayChance = gameState.stadiumQuality < 40 ? 0.15 : 0.05;
  if (Math.random() < decayChance) {
    events.push(CITY_EVENTS.stadiumDecay);
  }

  // Stadium Renovation: High reserves + moderate quality
  if (gameState.reserves > 200000 && gameState.stadiumQuality >= 40 && gameState.stadiumQuality < 70) {
    if (Math.random() < 0.10) {
      events.push(CITY_EVENTS.stadiumRenovation);
    }
  }

  // Community Day: Moderate-high pride
  if (gameState.teamPride > 45 && gameState.teamPride < 75) {
    if (Math.random() < 0.20) {
      events.push(CITY_EVENTS.communityDay);
    }
  }

  // ============================================
  // STORY TRIGGERS
  // ============================================

  // Dynasty Building: Multiple consecutive winning seasons
  if (gameState.consecutiveWinningSeasons >= 3) {
    if (Math.random() < 0.40) {
      events.push(STORY_EVENTS.dynastyBuilding);
    }
  }

  // Dark Days: Multiple losing seasons (inferred from low pride)
  if (gameState.winPercentage < 0.350 && gameState.teamPride < 30) {
    if (Math.random() < 0.30) {
      events.push(STORY_EVENTS.darkDays);
    }
  }

  // Turnaround Begins: First winning season after struggles
  if (gameState.winPercentage > 0.500 && gameState.teamPride < 40) {
    if (Math.random() < 0.35) {
      events.push(STORY_EVENTS.turnaroundBegins);
    }
  }

  // Limit to max 3 events per season to avoid overwhelming player
  return events.slice(0, 3);
}

// ============================================
// EFFECT APPLICATION
// ============================================

/**
 * Calculate the combined modifier from multiple events
 */
export function combineModifiers(events: NarrativeEvent[], effectKey: keyof EventEffects): number {
  let combined = 1.0;
  for (const event of events) {
    const modifier = event.effects[effectKey];
    if (typeof modifier === 'number') {
      combined *= modifier;
    }
  }
  return combined;
}

/**
 * Calculate total additive changes from events
 */
export function sumChanges(events: NarrativeEvent[], effectKey: keyof EventEffects): number {
  let total = 0;
  for (const event of events) {
    const change = event.effects[effectKey];
    if (typeof change === 'number') {
      total += change;
    }
  }
  return total;
}

/**
 * Apply event effects to game state
 * Returns the modified values
 */
export function applyEventEffects(
  gameState: GameState,
  events: NarrativeEvent[]
): {
  newPride: number;
  newPopulation: number;
  newStadiumQuality: number;
  attendanceMultiplier: number;
  revenueMultiplier: number;
  merchandiseMultiplier: number;
  totalMaintenanceCost: number;
  moraleChange: number;
} {
  const attendanceMultiplier = combineModifiers(events, 'attendanceModifier');
  const revenueMultiplier = combineModifiers(events, 'revenueModifier');
  const merchandiseMultiplier = combineModifiers(events, 'merchandiseModifier');

  const prideChange = sumChanges(events, 'prideChange');
  const populationChange = sumChanges(events, 'populationChange');
  const stadiumQualityChange = sumChanges(events, 'stadiumQualityChange');
  const moraleChange = sumChanges(events, 'moraleChange');
  const totalMaintenanceCost = sumChanges(events, 'maintenanceCost');

  return {
    newPride: Math.max(0, Math.min(100, gameState.teamPride + prideChange)),
    newPopulation: Math.max(1000, gameState.population + populationChange),
    newStadiumQuality: Math.max(10, Math.min(100, gameState.stadiumQuality + stadiumQualityChange)),
    attendanceMultiplier,
    revenueMultiplier: revenueMultiplier || 1.0,
    merchandiseMultiplier: merchandiseMultiplier || 1.0,
    totalMaintenanceCost,
    moraleChange,
  };
}

// ============================================
// EVENT SERIALIZATION
// ============================================

/**
 * Convert event to database-ready format
 */
export function serializeEvent(event: NarrativeEvent): {
  type: string;
  title: string;
  description: string;
  effects: Record<string, number>;
  duration_years: number | null;
} {
  return {
    type: event.type,
    title: event.title,
    description: event.description,
    effects: event.effects as Record<string, number>,
    duration_years: event.durationYears ?? null,
  };
}

// ============================================
// TIER-SPECIFIC EVENT MODIFIERS
// ============================================

/**
 * Adjust event probability based on tier
 * Higher tiers have more media attention = more events
 */
export function getTierEventMultiplier(tier: Tier): number {
  const multipliers: Record<Tier, number> = {
    LOW_A: 0.7,    // Fewer events in low minors
    HIGH_A: 0.85,
    DOUBLE_A: 1.0,
    TRIPLE_A: 1.15,
    MLB: 1.5,      // More events at MLB level
  };
  return multipliers[tier];
}

/**
 * Check for events with tier-adjusted probabilities
 */
export function checkForEventsWithTier(gameState: GameState): NarrativeEvent[] {
  const events = checkForEvents(gameState);
  const tierMultiplier = getTierEventMultiplier(gameState.tier);

  // For each event, roll again with tier multiplier to potentially remove it
  return events.filter(() => Math.random() < tierMultiplier);
}
