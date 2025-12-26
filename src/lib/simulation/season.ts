// ============================================
// Season Outcome Simulation Engine
// Simulates season results based on team strength
// ============================================

import type {
  Player,
  Tier,
  AITeam,
  SeasonSimulationResult,
  PlayerGrowthResult,
  TIER_CONFIGS,
} from '@/lib/types';
import {
  calculateRosterGrowth,
  simulateInjury,
} from './player-development';

// ============================================
// CONFIGURATION
// ============================================

const SEASON_CONFIG = {
  // Games per tier
  GAMES_BY_TIER: {
    LOW_A: 132,
    HIGH_A: 132,
    DOUBLE_A: 138,
    TRIPLE_A: 144,
    MLB: 162,
  } as Record<Tier, number>,

  // Playoff teams per tier
  PLAYOFF_TEAMS: 4,

  // Team count
  TOTAL_TEAMS: 20,

  // Strength calculation weights
  WEIGHTS: {
    PLAYER_RATING: 1.0,
    COACHING: 0.15,
    MORALE: 0.1,
  },
};

// ============================================
// TEAM STRENGTH CALCULATION
// ============================================

/**
 * Calculate a team's overall strength based on roster
 */
export function calculateTeamStrength(
  players: Player[],
  hittingCoachSkill: number,
  pitchingCoachSkill: number
): number {
  if (players.length === 0) return 30; // Minimum strength

  // Calculate average rating of active roster
  const activePlayers = players.filter(p => p.isOnRoster && !p.isInjured);
  if (activePlayers.length === 0) return 30;

  const avgRating = activePlayers.reduce((sum, p) => sum + p.currentRating, 0) / activePlayers.length;

  // Split by position type for weighted calculation
  const hitters = activePlayers.filter(p => p.playerType === 'HITTER');
  const pitchers = activePlayers.filter(p => p.playerType === 'PITCHER');

  const avgHitterRating = hitters.length > 0
    ? hitters.reduce((sum, p) => sum + p.currentRating, 0) / hitters.length
    : 40;

  const avgPitcherRating = pitchers.length > 0
    ? pitchers.reduce((sum, p) => sum + p.currentRating, 0) / pitchers.length
    : 40;

  // Calculate coaching bonus
  const coachingBonus =
    ((hittingCoachSkill - 50) / 30) * SEASON_CONFIG.WEIGHTS.COACHING * 10 +
    ((pitchingCoachSkill - 50) / 30) * SEASON_CONFIG.WEIGHTS.COACHING * 10;

  // Calculate morale bonus
  const avgMorale = activePlayers.reduce((sum, p) => sum + p.morale, 0) / activePlayers.length;
  const moraleBonus = ((avgMorale - 50) / 50) * SEASON_CONFIG.WEIGHTS.MORALE * 5;

  // Final strength: weighted average of ratings + bonuses
  // Pitching and hitting are equally weighted (50/50)
  const baseStrength = (avgHitterRating * 0.5) + (avgPitcherRating * 0.5);

  return baseStrength + coachingBonus + moraleBonus;
}

/**
 * Calculate AI team strength for the season
 */
export function calculateAITeamStrength(aiTeam: AITeam, tier: Tier): number {
  // Base strength from team configuration
  const baseStrength = aiTeam.baseStrength;

  // Add tier-appropriate modifier (higher tiers have better players)
  const tierModifier = {
    LOW_A: 0,
    HIGH_A: 5,
    DOUBLE_A: 10,
    TRIPLE_A: 15,
    MLB: 20,
  }[tier];

  // Add random variance based on team's variance multiplier
  const variance = (Math.random() * 2 - 1) * 5 * aiTeam.varianceMultiplier;

  return baseStrength + tierModifier + variance;
}

// ============================================
// WIN PERCENTAGE CALCULATION
// ============================================

/**
 * Calculate expected win percentage based on strength differential
 * Uses a logistic function to map strength difference to win probability
 */
export function calculateExpectedWinPct(
  teamStrength: number,
  avgOpponentStrength: number
): number {
  const strengthDiff = teamStrength - avgOpponentStrength;

  // Logistic function: win% = 1 / (1 + e^(-k * diff))
  // k = 0.1 gives reasonable spread
  const k = 0.1;
  const basePct = 1 / (1 + Math.exp(-k * strengthDiff));

  // Clamp between .250 and .750 for realistic bounds
  return Math.max(0.250, Math.min(0.750, basePct));
}

/**
 * Simulate a season's win-loss record with variance
 */
export function simulateSeasonRecord(
  expectedWinPct: number,
  totalGames: number
): { wins: number; losses: number; actualWinPct: number } {
  // Add variance to each game simulation
  let wins = 0;

  for (let i = 0; i < totalGames; i++) {
    // Add game-by-game variance
    const gameVariance = (Math.random() * 0.1) - 0.05;
    const adjustedWinProb = Math.max(0.1, Math.min(0.9, expectedWinPct + gameVariance));

    if (Math.random() < adjustedWinProb) {
      wins++;
    }
  }

  const losses = totalGames - wins;
  const actualWinPct = wins / totalGames;

  return { wins, losses, actualWinPct };
}

// ============================================
// LEAGUE STANDINGS
// ============================================

interface TeamStanding {
  teamId: string;
  teamName: string;
  wins: number;
  losses: number;
  winPct: number;
  strength: number;
}

/**
 * Simulate standings for all 20 teams including the player
 */
export function simulateLeagueStandings(
  playerStrength: number,
  aiTeams: AITeam[],
  tier: Tier
): {
  standings: TeamStanding[];
  playerRank: number;
  madePlayoffs: boolean;
  wonDivision: boolean;
} {
  const totalGames = SEASON_CONFIG.GAMES_BY_TIER[tier];
  const standings: TeamStanding[] = [];

  // Simulate player's season
  const avgLeagueStrength = aiTeams.reduce(
    (sum, t) => sum + calculateAITeamStrength(t, tier),
    0
  ) / aiTeams.length;

  const playerWinPct = calculateExpectedWinPct(playerStrength, avgLeagueStrength);
  const playerRecord = simulateSeasonRecord(playerWinPct, totalGames);

  standings.push({
    teamId: 'player',
    teamName: 'Your Team',
    wins: playerRecord.wins,
    losses: playerRecord.losses,
    winPct: playerRecord.actualWinPct,
    strength: playerStrength,
  });

  // Simulate AI team seasons
  for (const aiTeam of aiTeams) {
    const aiStrength = calculateAITeamStrength(aiTeam, tier);
    const aiWinPct = calculateExpectedWinPct(aiStrength, avgLeagueStrength);
    const aiRecord = simulateSeasonRecord(aiWinPct, totalGames);

    standings.push({
      teamId: aiTeam.id,
      teamName: `${aiTeam.city} ${aiTeam.name}`,
      wins: aiRecord.wins,
      losses: aiRecord.losses,
      winPct: aiRecord.actualWinPct,
      strength: aiStrength,
    });
  }

  // Sort by win percentage (descending)
  standings.sort((a, b) => b.winPct - a.winPct);

  // Find player's rank
  const playerRank = standings.findIndex(t => t.teamId === 'player') + 1;

  // Determine playoff and division status
  const madePlayoffs = playerRank <= SEASON_CONFIG.PLAYOFF_TEAMS;
  const wonDivision = playerRank === 1;

  return { standings, playerRank, madePlayoffs, wonDivision };
}

// ============================================
// PLAYOFF SIMULATION
// ============================================

interface PlayoffResult {
  wonChampionship: boolean;
  wonWorldSeries: boolean;
  eliminationRound: 'divisional' | 'championship' | 'world_series' | null;
}

/**
 * Simulate playoff results
 */
export function simulatePlayoffs(
  playerStrength: number,
  madePlayoffs: boolean,
  playerRank: number,
  tier: Tier
): PlayoffResult {
  if (!madePlayoffs) {
    return {
      wonChampionship: false,
      wonWorldSeries: false,
      eliminationRound: null,
    };
  }

  // Playoff series are decided by strength differential + luck
  const playoffLuck = () => (Math.random() * 10) - 5;

  // Divisional Round (vs 4th seed if 1st, vs 3rd if 2nd)
  const divisionalOpponentStrength = 50 + (4 - Math.min(playerRank, 4)) * 3;
  const divisionalWin = (playerStrength + playoffLuck()) > (divisionalOpponentStrength + playoffLuck());

  if (!divisionalWin) {
    return {
      wonChampionship: false,
      wonWorldSeries: false,
      eliminationRound: 'divisional',
    };
  }

  // Championship Round
  const championshipOpponentStrength = 55 + playoffLuck();
  const championshipWin = (playerStrength + playoffLuck()) > (championshipOpponentStrength + playoffLuck());

  if (!championshipWin) {
    return {
      wonChampionship: false,
      wonWorldSeries: false,
      eliminationRound: 'championship',
    };
  }

  // Only MLB tier has World Series
  if (tier !== 'MLB') {
    return {
      wonChampionship: true,
      wonWorldSeries: false,
      eliminationRound: null,
    };
  }

  // World Series (MLB only)
  const worldSeriesOpponentStrength = 60 + playoffLuck();
  const worldSeriesWin = (playerStrength + playoffLuck()) > (worldSeriesOpponentStrength + playoffLuck());

  if (!worldSeriesWin) {
    return {
      wonChampionship: true,
      wonWorldSeries: false,
      eliminationRound: 'world_series',
    };
  }

  return {
    wonChampionship: true,
    wonWorldSeries: true,
    eliminationRound: null,
  };
}

// ============================================
// ATTENDANCE CALCULATION
// ============================================

interface AttendanceResult {
  avgAttendance: number;
  totalAttendance: number;
}

/**
 * Calculate season attendance
 *
 * From PRD:
 * Base Attendance = stadiumCapacity × 0.4
 * Multipliers:
 * × (winPct / 0.500) ^ 1.5
 * × (0.7 + cityPride/100 × 0.8)
 * × (1 - unemployment/100 × 0.5)
 * × (0.8 + stadiumQuality/100 × 0.4)
 */
export function calculateAttendance(
  stadiumCapacity: number,
  winPct: number,
  cityPride: number,
  unemploymentRate: number,
  stadiumQuality: number,
  totalHomeGames: number
): AttendanceResult {
  // Base attendance is 40% of capacity
  let baseAttendance = stadiumCapacity * 0.4;

  // Winning multiplier (exponential effect)
  const winMultiplier = Math.pow(winPct / 0.500, 1.5);
  baseAttendance *= winMultiplier;

  // City pride multiplier (0.7x to 1.5x)
  const prideMultiplier = 0.7 + (cityPride / 100) * 0.8;
  baseAttendance *= prideMultiplier;

  // Unemployment multiplier (hurts attendance)
  const unemploymentMultiplier = 1 - (unemploymentRate / 100) * 0.5;
  baseAttendance *= unemploymentMultiplier;

  // Stadium quality multiplier (0.8x to 1.2x)
  const qualityMultiplier = 0.8 + (stadiumQuality / 100) * 0.4;
  baseAttendance *= qualityMultiplier;

  // Add some game-to-game variance
  const variance = 0.9 + Math.random() * 0.2;
  baseAttendance *= variance;

  // Cap at stadium capacity
  const avgAttendance = Math.min(Math.round(baseAttendance), stadiumCapacity);
  const totalAttendance = avgAttendance * totalHomeGames;

  return { avgAttendance, totalAttendance };
}

// ============================================
// FULL SEASON SIMULATION
// ============================================

export interface SeasonSimulationInput {
  players: Player[];
  hittingCoachSkill: number;
  pitchingCoachSkill: number;
  developmentCoordSkill: number;
  tier: Tier;
  stadiumCapacity: number;
  stadiumQuality: number;
  cityPride: number;
  unemploymentRate: number;
  aiTeams: AITeam[];
  tierConfigs: typeof TIER_CONFIGS;
}

/**
 * Run full season simulation including:
 * - Team strength calculation
 * - League standings
 * - Playoffs
 * - Attendance
 * - Player development
 */
export function simulateSeason(input: SeasonSimulationInput): SeasonSimulationResult {
  const {
    players,
    hittingCoachSkill,
    pitchingCoachSkill,
    developmentCoordSkill,
    tier,
    stadiumCapacity,
    stadiumQuality,
    cityPride,
    unemploymentRate,
    aiTeams,
    tierConfigs,
  } = input;

  const totalGames = SEASON_CONFIG.GAMES_BY_TIER[tier];
  const homeGames = Math.floor(totalGames / 2);

  // 1. Process injuries for the season
  const injuryResults = players.map(p => ({
    player: p,
    injury: simulateInjury(p),
  }));

  // 2. Calculate team strength
  const teamStrength = calculateTeamStrength(
    players,
    hittingCoachSkill,
    pitchingCoachSkill
  );

  // 3. Simulate league standings
  const { standings, playerRank, madePlayoffs, wonDivision } = simulateLeagueStandings(
    teamStrength,
    aiTeams,
    tier
  );

  const playerStanding = standings.find(s => s.teamId === 'player')!;

  // 4. Simulate playoffs if qualified
  const playoffResult = simulatePlayoffs(
    teamStrength,
    madePlayoffs,
    playerRank,
    tier
  );

  // 5. Calculate attendance
  const attendance = calculateAttendance(
    stadiumCapacity,
    playerStanding.winPct,
    cityPride,
    unemploymentRate,
    stadiumQuality,
    homeGames
  );

  // 6. Calculate player growth
  const playerGrowthResults = calculateRosterGrowth(
    players,
    hittingCoachSkill,
    pitchingCoachSkill,
    developmentCoordSkill,
    tierConfigs
  );

  return {
    wins: playerStanding.wins,
    losses: playerStanding.losses,
    winPct: playerStanding.winPct,

    divisionRank: playerRank,
    madePlayoffs,
    wonDivision,
    wonChampionship: playoffResult.wonChampionship,
    wonWorldSeries: playoffResult.wonWorldSeries,

    avgAttendance: attendance.avgAttendance,
    totalAttendance: attendance.totalAttendance,

    playerGrowthResults,
  };
}

// ============================================
// SEASON PROGRESSION
// ============================================

/**
 * Check if team qualifies for tier promotion
 *
 * From PRD requirements per tier
 */
export function checkPromotionEligibility(
  tier: Tier,
  winPct: number,
  consecutiveWinningSeasons: number,
  reserves: number,
  cityPride: number,
  wonDivision: boolean,
  wonChampionship: boolean,
  tierConfigs: typeof TIER_CONFIGS
): { eligible: boolean; reasons: string[]; missing: string[] } {
  const config = tierConfigs[tier];
  const requirements = config.promotionRequirements;

  if (!requirements) {
    return { eligible: false, reasons: [], missing: ['Already at MLB level'] };
  }

  const reasons: string[] = [];
  const missing: string[] = [];

  // Check win percentage
  if (winPct >= requirements.winPct) {
    reasons.push(`Win% (${(winPct * 100).toFixed(1)}%) meets requirement (${(requirements.winPct * 100).toFixed(1)}%)`);
  } else {
    missing.push(`Win% (${(winPct * 100).toFixed(1)}%) below requirement (${(requirements.winPct * 100).toFixed(1)}%)`);
  }

  // Check consecutive years (simplified - assume this is tracked externally)
  if (consecutiveWinningSeasons >= requirements.consecutiveYears) {
    reasons.push(`${consecutiveWinningSeasons} consecutive winning seasons meets requirement`);
  } else {
    missing.push(`Need ${requirements.consecutiveYears - consecutiveWinningSeasons} more winning season(s)`);
  }

  // Check reserves
  if (reserves >= requirements.reserves) {
    reasons.push(`Reserves ($${reserves.toLocaleString()}) meet requirement ($${requirements.reserves.toLocaleString()})`);
  } else {
    missing.push(`Reserves ($${reserves.toLocaleString()}) below requirement ($${requirements.reserves.toLocaleString()})`);
  }

  // Check city pride
  if (cityPride >= requirements.cityPride) {
    reasons.push(`City Pride (${cityPride}) meets requirement (${requirements.cityPride})`);
  } else {
    missing.push(`City Pride (${cityPride}) below requirement (${requirements.cityPride})`);
  }

  // Check division title if required
  if (requirements.divisionTitle) {
    if (wonDivision) {
      reasons.push('Won division title');
    } else {
      missing.push('Must win division');
    }
  }

  // Check league championship if required
  if (requirements.leagueChampionship) {
    if (wonChampionship) {
      reasons.push('Won league championship');
    } else {
      missing.push('Must win league championship');
    }
  }

  const eligible = missing.length === 0;

  return { eligible, reasons, missing };
}
