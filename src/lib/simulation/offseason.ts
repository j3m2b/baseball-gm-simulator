// ============================================
// Offseason Rollover System
// Handles transition between seasons
// ============================================

import type { AITeam, Tier } from '@/lib/types';

// ============================================
// TYPES
// ============================================

export interface SeasonStatsSummary {
  year: number;
  tier: string;
  gamesPlayed: number;
  // Hitter stats
  atBats?: number;
  hits?: number;
  homeRuns?: number;
  rbi?: number;
  runs?: number;
  stolenBases?: number;
  avg?: number;
  obp?: number;
  slg?: number;
  // Pitcher stats
  wins?: number;
  losses?: number;
  era?: number;
  innings?: number;
  strikeouts?: number;
  walks?: number;
  saves?: number;
}

export interface CareerStats {
  seasons: SeasonStatsSummary[];
  careerTotals: {
    gamesPlayed: number;
    // Hitter totals
    atBats?: number;
    hits?: number;
    homeRuns?: number;
    rbi?: number;
    // Pitcher totals
    wins?: number;
    losses?: number;
    innings?: number;
    strikeouts?: number;
  };
}

export interface TeamHistoryEntry {
  year: number;
  tier: string;
  wins: number;
  losses: number;
  winPct: number;
  leagueRank: number;
  madePlayoffs: boolean;
  playoffResult: 'Champion' | 'Finals' | 'Semifinals' | 'Missed';
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
  avgAttendance: number;
  mvpPlayerId?: string;
  mvpPlayerName?: string;
}

export interface DraftOrderEntry {
  pickNumber: number;
  teamId: string;
  teamName: string;
  previousSeasonWins: number;
  previousSeasonLosses: number;
}

export interface WinterDevelopmentResult {
  playerId: string;
  playerName: string;
  age: number;
  previousRating: number;
  newRating: number;
  ratingChange: number;
  reason: string;
}

export interface ContractExpirationResult {
  playerId: string;
  playerName: string;
  position: string;
  previousRating: number;
  becameFreeAgent: boolean;
}

export interface OffseasonSummary {
  previousYear: number;
  newYear: number;
  teamHistory: TeamHistoryEntry;
  winterDevelopment: WinterDevelopmentResult[];
  contractExpirations: ContractExpirationResult[];
  departingFreeAgents: ContractExpirationResult[];
  draftOrder: DraftOrderEntry[];
  playerDraftPosition: number;
}

// ============================================
// HISTORICAL ARCHIVING
// ============================================

/**
 * Archive a player's season stats to their career history
 */
export function archiveSeasonStats(
  currentSeasonStats: Record<string, unknown> | null,
  existingCareerStats: SeasonStatsSummary[],
  year: number,
  tier: string,
  playerType: 'HITTER' | 'PITCHER'
): SeasonStatsSummary[] {
  const stats = currentSeasonStats || {};

  const seasonSummary: SeasonStatsSummary = {
    year,
    tier,
    gamesPlayed: (stats.gamesPlayed as number) || 0,
  };

  if (playerType === 'HITTER') {
    seasonSummary.atBats = (stats.atBats as number) || 0;
    seasonSummary.hits = (stats.hits as number) || 0;
    seasonSummary.homeRuns = (stats.homeRuns as number) || 0;
    seasonSummary.rbi = (stats.rbi as number) || 0;
    seasonSummary.runs = (stats.runs as number) || 0;
    seasonSummary.stolenBases = (stats.stolenBases as number) || 0;

    // Calculate rate stats
    const ab = seasonSummary.atBats || 1;
    seasonSummary.avg = Math.round((seasonSummary.hits / ab) * 1000) / 1000;
    seasonSummary.obp = (stats.obp as number) || seasonSummary.avg;
    seasonSummary.slg = (stats.slg as number) || seasonSummary.avg;
  } else {
    seasonSummary.wins = (stats.wins as number) || 0;
    seasonSummary.losses = (stats.losses as number) || 0;
    seasonSummary.era = (stats.era as number) || 0;
    seasonSummary.innings = (stats.innings as number) || 0;
    seasonSummary.strikeouts = (stats.strikeouts as number) || 0;
    seasonSummary.walks = (stats.walks as number) || 0;
    seasonSummary.saves = (stats.saves as number) || 0;
  }

  return [...existingCareerStats, seasonSummary];
}

/**
 * Create empty season stats for a new season
 */
export function createEmptySeasonStats(playerType: 'HITTER' | 'PITCHER'): Record<string, number> {
  if (playerType === 'HITTER') {
    return {
      gamesPlayed: 0,
      atBats: 0,
      hits: 0,
      homeRuns: 0,
      rbi: 0,
      runs: 0,
      stolenBases: 0,
      walks: 0,
      strikeouts: 0,
      doubles: 0,
      triples: 0,
    };
  } else {
    return {
      gamesPlayed: 0,
      gamesStarted: 0,
      wins: 0,
      losses: 0,
      saves: 0,
      innings: 0,
      hits: 0,
      runs: 0,
      earnedRuns: 0,
      walks: 0,
      strikeouts: 0,
      homeRuns: 0,
    };
  }
}

// ============================================
// ROSTER AGING & WINTER DEVELOPMENT
// ============================================

/**
 * Calculate winter development rating change based on age
 */
export function calculateWinterDevelopment(
  age: number,
  currentRating: number,
  potential: number,
  workEthic: 'poor' | 'average' | 'excellent' = 'average'
): { ratingChange: number; reason: string } {
  let ratingChange = 0;
  let reason = '';

  // Work ethic modifier
  const ethicModifier = workEthic === 'excellent' ? 1.3 : workEthic === 'poor' ? 0.7 : 1.0;

  if (age >= 18 && age <= 21) {
    // Young prospects: High growth potential
    const growthRoom = potential - currentRating;
    const baseGrowth = Math.floor(Math.random() * 3) + 1; // 1-3 points
    ratingChange = Math.min(growthRoom, Math.round(baseGrowth * ethicModifier));
    reason = 'Young prospect development';
  } else if (age >= 22 && age <= 24) {
    // Developing players: Moderate growth
    const growthRoom = potential - currentRating;
    const baseGrowth = Math.floor(Math.random() * 2) + 1; // 1-2 points
    ratingChange = Math.min(growthRoom, Math.round(baseGrowth * ethicModifier));
    reason = 'Continued development';
  } else if (age >= 25 && age <= 29) {
    // Prime years: Slight growth or maintenance
    if (currentRating < potential && Math.random() > 0.5) {
      ratingChange = Math.round(1 * ethicModifier);
      reason = 'Peak years refinement';
    } else {
      ratingChange = 0;
      reason = 'Maintained peak form';
    }
  } else if (age >= 30 && age <= 33) {
    // Early decline: Slight decline possible
    if (Math.random() > 0.6) {
      ratingChange = -1;
      reason = 'Early aging effects';
    } else {
      ratingChange = 0;
      reason = 'Maintained form';
    }
  } else if (age >= 34 && age <= 36) {
    // Decline phase: Moderate decline
    const declineChance = 0.4 + (age - 34) * 0.1;
    if (Math.random() < declineChance) {
      ratingChange = -(Math.floor(Math.random() * 2) + 1); // -1 to -2
      reason = 'Age-related decline';
    } else {
      ratingChange = 0;
      reason = 'Defying age';
    }
  } else if (age >= 37) {
    // Late career: Significant decline likely
    const declineChance = 0.6 + (age - 37) * 0.1;
    if (Math.random() < declineChance) {
      ratingChange = -(Math.floor(Math.random() * 3) + 1); // -1 to -3
      reason = 'Late career decline';
    } else {
      ratingChange = -1;
      reason = 'Aging gracefully';
    }
  }

  return { ratingChange, reason };
}

/**
 * Apply rating change with bounds checking
 */
export function applyRatingChange(
  currentRating: number,
  change: number,
  minRating: number = 20,
  maxRating: number = 99
): number {
  return Math.max(minRating, Math.min(maxRating, currentRating + change));
}

// ============================================
// CONTRACT SYSTEM
// ============================================

/**
 * Process contract year decrement
 * Returns true if player becomes a free agent
 */
export function processContractYear(
  currentContractYears: number
): { newContractYears: number; becameFreeAgent: boolean } {
  const newContractYears = Math.max(0, currentContractYears - 1);
  return {
    newContractYears,
    becameFreeAgent: newContractYears === 0,
  };
}

// ============================================
// DRAFT ORDER GENERATION
// ============================================

/**
 * Generate draft order based on reverse standings
 * Worst team gets first pick
 */
export function generateDraftOrder(
  playerTeamName: string,
  playerWins: number,
  playerLosses: number,
  aiTeams: AITeam[],
  year: number
): DraftOrderEntry[] {
  interface TeamStanding {
    teamId: string;
    teamName: string;
    wins: number;
    losses: number;
    winPct: number;
  }

  const standings: TeamStanding[] = [];

  // Add player team
  const playerWinPct = playerWins / (playerWins + playerLosses) || 0;
  standings.push({
    teamId: 'player',
    teamName: playerTeamName,
    wins: playerWins,
    losses: playerLosses,
    winPct: playerWinPct,
  });

  // Generate AI team standings (simulated from their base strength)
  for (const aiTeam of aiTeams) {
    const baseWinPct = 0.35 + (aiTeam.baseStrength / 100) * 0.35;
    const variance = (Math.random() - 0.5) * aiTeam.varianceMultiplier * 0.15;
    const winPct = Math.max(0.25, Math.min(0.75, baseWinPct + variance));

    const totalGames = playerWins + playerLosses;
    const wins = Math.round(winPct * totalGames);
    const losses = totalGames - wins;

    standings.push({
      teamId: aiTeam.id,
      teamName: `${aiTeam.city} ${aiTeam.name}`,
      wins,
      losses,
      winPct,
    });
  }

  // Sort by win percentage (ascending - worst first)
  standings.sort((a, b) => a.winPct - b.winPct);

  // Create draft order
  return standings.map((team, index) => ({
    pickNumber: index + 1,
    teamId: team.teamId,
    teamName: team.teamName,
    previousSeasonWins: team.wins,
    previousSeasonLosses: team.losses,
  }));
}

/**
 * Get player's draft position from draft order
 */
export function getPlayerDraftPosition(draftOrder: DraftOrderEntry[]): number {
  const playerEntry = draftOrder.find(entry => entry.teamId === 'player');
  return playerEntry?.pickNumber || draftOrder.length;
}

// ============================================
// PLAYOFF RESULT DETERMINATION
// ============================================

/**
 * Determine playoff result string from bracket data
 */
export function determinePlayoffResult(
  madePlayoffs: boolean,
  championTeamId: string | null,
  finalsWinnerId: string | null,
  semifinalsWinnerId: string | null,
  playerTeamId: string = 'player'
): 'Champion' | 'Finals' | 'Semifinals' | 'Missed' {
  if (!madePlayoffs) {
    return 'Missed';
  }

  if (championTeamId === playerTeamId) {
    return 'Champion';
  }

  if (finalsWinnerId && finalsWinnerId !== playerTeamId) {
    // Player was in finals but lost
    return 'Finals';
  }

  if (semifinalsWinnerId && semifinalsWinnerId !== playerTeamId) {
    // Player lost in semifinals
    return 'Semifinals';
  }

  // Default - made playoffs but result unclear
  return 'Semifinals';
}

// ============================================
// MVP CALCULATION
// ============================================

interface PlayerMVPCandidate {
  id: string;
  name: string;
  playerType: 'HITTER' | 'PITCHER';
  seasonStats: Record<string, unknown> | null;
  currentRating: number;
}

/**
 * Calculate MVP score for a player
 */
export function calculateMVPScore(player: PlayerMVPCandidate): number {
  const stats = player.seasonStats || {};
  let score = player.currentRating; // Base score is their rating

  if (player.playerType === 'HITTER') {
    // Weight offensive contributions
    score += ((stats.homeRuns as number) || 0) * 2;
    score += ((stats.rbi as number) || 0) * 0.5;
    score += ((stats.hits as number) || 0) * 0.3;
    score += ((stats.stolenBases as number) || 0) * 0.5;

    // Batting average bonus
    const atBats = (stats.atBats as number) || 1;
    const hits = (stats.hits as number) || 0;
    const avg = hits / atBats;
    if (avg >= 0.300) score += 10;
    if (avg >= 0.350) score += 10;
  } else {
    // Weight pitching contributions
    score += ((stats.wins as number) || 0) * 5;
    score += ((stats.strikeouts as number) || 0) * 0.2;
    score += ((stats.saves as number) || 0) * 3;

    // ERA bonus (lower is better)
    const era = (stats.era as number) || 5.0;
    if (era <= 3.00) score += 15;
    if (era <= 2.50) score += 10;
  }

  return score;
}

/**
 * Determine season MVP from roster
 */
export function determineSeasonMVP(
  players: PlayerMVPCandidate[]
): { playerId: string; playerName: string } | null {
  if (players.length === 0) return null;

  let mvp = players[0];
  let highestScore = calculateMVPScore(mvp);

  for (const player of players.slice(1)) {
    const score = calculateMVPScore(player);
    if (score > highestScore) {
      highestScore = score;
      mvp = player;
    }
  }

  return {
    playerId: mvp.id,
    playerName: mvp.name,
  };
}
