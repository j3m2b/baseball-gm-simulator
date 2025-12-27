// ============================================
// Playoff Simulation Engine
// Handles playoff bracket generation and series simulation
// ============================================

import type {
  PlayoffBracket,
  PlayoffSeries,
  PlayoffGame,
  PlayoffTeam,
  PlayoffRound,
  PlayoffStatus,
  SeriesStatus,
  AITeam,
} from '@/lib/types';

// ============================================
// TYPES
// ============================================

export interface PlayoffStanding {
  teamId: string;
  teamName: string;
  wins: number;
  losses: number;
  winPct: number;
  isPlayer: boolean;
}

export interface PlayoffBracketInput {
  gameId: string;
  seasonId: string;
  year: number;
  playerTeamName: string;
  playerWins: number;
  playerLosses: number;
  aiTeams: AITeam[];
}

export interface PlayoffGameResult {
  gameNumber: number;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number;
  awayScore: number;
  winnerId: string;
  homeLineScore: number[];
  awayLineScore: number[];
  attendance: number;
}

export interface SeriesResult {
  winnerId: string;
  winnerName: string;
  team1Wins: number;
  team2Wins: number;
  games: PlayoffGameResult[];
}

// ============================================
// CONSTANTS
// ============================================

const SERIES_WINS_NEEDED = 3; // Best of 5
const MAX_GAMES_IN_SERIES = 5;

// ============================================
// PLAYOFF BRACKET GENERATION
// ============================================

/**
 * Generate playoff standings from season results
 * Returns top 4 teams seeded by win percentage
 */
export function generatePlayoffStandings(
  input: PlayoffBracketInput
): PlayoffStanding[] {
  const standings: PlayoffStanding[] = [];

  // Add player team
  standings.push({
    teamId: 'player',
    teamName: input.playerTeamName,
    wins: input.playerWins,
    losses: input.playerLosses,
    winPct: input.playerWins / (input.playerWins + input.playerLosses),
    isPlayer: true,
  });

  // Generate AI team standings (simulated season records)
  for (const aiTeam of input.aiTeams) {
    // AI teams have varying performance based on baseStrength
    const baseWinPct = 0.35 + (aiTeam.baseStrength / 100) * 0.35;
    const variance = (Math.random() - 0.5) * aiTeam.varianceMultiplier * 0.2;
    const winPct = Math.max(0.25, Math.min(0.75, baseWinPct + variance));

    const totalGames = input.playerWins + input.playerLosses;
    const wins = Math.round(winPct * totalGames);
    const losses = totalGames - wins;

    standings.push({
      teamId: aiTeam.id,
      teamName: `${aiTeam.city} ${aiTeam.name}`,
      wins,
      losses,
      winPct,
      isPlayer: false,
    });
  }

  // Sort by win percentage (descending)
  standings.sort((a, b) => b.winPct - a.winPct);

  // Return top 4 teams
  return standings.slice(0, 4);
}

/**
 * Generate initial playoff bracket structure
 */
export function generatePlayoffBracket(
  input: PlayoffBracketInput
): {
  bracket: Omit<PlayoffBracket, 'id'>;
  standings: PlayoffStanding[];
} {
  const standings = generatePlayoffStandings(input);

  // Seed matchups: 1 vs 4, 2 vs 3
  const semifinal1Teams = [standings[0], standings[3]]; // 1 vs 4
  const semifinal2Teams = [standings[1], standings[2]]; // 2 vs 3

  const createTeam = (standing: PlayoffStanding, seed: number): PlayoffTeam => ({
    id: standing.teamId,
    name: standing.teamName,
    seed,
    wins: standing.wins,
    losses: standing.losses,
    winPct: standing.winPct,
  });

  const bracket: Omit<PlayoffBracket, 'id'> = {
    gameId: input.gameId,
    seasonId: input.seasonId,
    year: input.year,
    status: 'semifinals',
    championTeamId: null,
    championTeamName: null,
    semifinals: [
      {
        id: '', // Will be set by database
        bracketId: '',
        round: 'semifinals',
        seriesNumber: 1,
        team1: createTeam(semifinal1Teams[0], 1),
        team2: createTeam(semifinal1Teams[1], 4),
        team1Wins: 0,
        team2Wins: 0,
        status: 'pending',
        winnerId: null,
        winnerName: null,
        games: [],
      },
      {
        id: '',
        bracketId: '',
        round: 'semifinals',
        seriesNumber: 2,
        team1: createTeam(semifinal2Teams[0], 2),
        team2: createTeam(semifinal2Teams[1], 3),
        team1Wins: 0,
        team2Wins: 0,
        status: 'pending',
        winnerId: null,
        winnerName: null,
        games: [],
      },
    ],
    finals: null,
  };

  return { bracket, standings };
}

// ============================================
// PLAYOFF GAME SIMULATION
// ============================================

/**
 * Simulate a single playoff game between two teams
 * Uses a simplified simulation since we don't have full rosters for AI teams
 */
export function simulatePlayoffGame(
  homeTeam: PlayoffTeam,
  awayTeam: PlayoffTeam,
  gameNumber: number,
  stadiumCapacity: number
): PlayoffGameResult {
  // Calculate team strengths based on win percentage
  const homeStrength = homeTeam.winPct * 100 + 5; // Home field advantage
  const awayStrength = awayTeam.winPct * 100;
  const strengthDiff = (homeStrength - awayStrength) / 100;

  // Win probability calculation
  const winProb = 0.5 + strengthDiff;
  const clampedProb = Math.max(0.30, Math.min(0.70, winProb));

  const homeWins = Math.random() < clampedProb;

  // Generate runs - playoff games are typically lower scoring
  const baseHomeRuns = 3 + Math.floor(homeStrength / 25);
  const baseAwayRuns = 3 + Math.floor(awayStrength / 25);

  let homeScore: number;
  let awayScore: number;

  if (homeWins) {
    homeScore = baseHomeRuns + Math.floor(Math.random() * 4);
    awayScore = Math.max(0, homeScore - 1 - Math.floor(Math.random() * 3));
  } else {
    awayScore = baseAwayRuns + Math.floor(Math.random() * 4);
    homeScore = Math.max(0, awayScore - 1 - Math.floor(Math.random() * 3));
  }

  // Ensure no ties
  if (homeScore === awayScore) {
    if (homeWins) {
      homeScore++;
    } else {
      awayScore++;
    }
  }

  const winnerId = homeScore > awayScore ? homeTeam.id : awayTeam.id;

  // Generate line scores (9 innings)
  const homeLineScore = generatePlayoffLineScore(homeScore, 9);
  const awayLineScore = generatePlayoffLineScore(awayScore, 9);

  // Playoff games have higher attendance
  const baseAttendance = Math.floor(stadiumCapacity * (0.85 + Math.random() * 0.15));
  const playoffAttendanceBoost = 1.15;
  const attendance = Math.min(
    stadiumCapacity,
    Math.floor(baseAttendance * playoffAttendanceBoost)
  );

  return {
    gameNumber,
    homeTeamId: homeTeam.id,
    awayTeamId: awayTeam.id,
    homeScore,
    awayScore,
    winnerId,
    homeLineScore,
    awayLineScore,
    attendance,
  };
}

/**
 * Generate a line score for playoff games
 */
function generatePlayoffLineScore(totalRuns: number, innings: number = 9): number[] {
  const lineScore: number[] = new Array(innings).fill(0);
  let remaining = totalRuns;

  // Distribute runs across innings
  while (remaining > 0) {
    const inning = Math.floor(Math.random() * innings);
    // Weight towards later innings for drama
    if (inning >= 6 && Math.random() > 0.5) {
      lineScore[inning]++;
      remaining--;
    } else if (Math.random() > 0.3) {
      lineScore[inning]++;
      remaining--;
    }
  }

  return lineScore;
}

/**
 * Simulate a complete playoff series (Best of 5)
 */
export function simulatePlayoffSeries(
  series: PlayoffSeries,
  stadiumCapacity: number
): SeriesResult {
  const games: PlayoffGameResult[] = [];
  let team1Wins = series.team1Wins;
  let team2Wins = series.team2Wins;
  let gameNumber = games.length + 1;

  // Continue series until someone wins 3
  while (team1Wins < SERIES_WINS_NEEDED && team2Wins < SERIES_WINS_NEEDED && gameNumber <= MAX_GAMES_IN_SERIES) {
    // Home field advantage: Higher seed gets games 1, 2, 5 at home
    // Games 3, 4 at lower seed's home
    const isTeam1Home = gameNumber <= 2 || gameNumber === 5;

    const homeTeam = isTeam1Home ? series.team1 : series.team2;
    const awayTeam = isTeam1Home ? series.team2 : series.team1;

    const gameResult = simulatePlayoffGame(homeTeam, awayTeam, gameNumber, stadiumCapacity);
    games.push(gameResult);

    if (gameResult.winnerId === series.team1.id) {
      team1Wins++;
    } else {
      team2Wins++;
    }

    gameNumber++;
  }

  const winnerId = team1Wins >= SERIES_WINS_NEEDED ? series.team1.id : series.team2.id;
  const winnerName = team1Wins >= SERIES_WINS_NEEDED ? series.team1.name : series.team2.name;

  return {
    winnerId,
    winnerName,
    team1Wins,
    team2Wins,
    games,
  };
}

/**
 * Simulate a single game in a series (one at a time for UI)
 */
export function simulateNextSeriesGame(
  series: PlayoffSeries,
  stadiumCapacity: number
): {
  game: PlayoffGameResult;
  newTeam1Wins: number;
  newTeam2Wins: number;
  isSeriesComplete: boolean;
  winnerId: string | null;
  winnerName: string | null;
} {
  const gameNumber = series.team1Wins + series.team2Wins + 1;

  // Home field: Higher seed (team1) gets games 1, 2, 5 at home
  const isTeam1Home = gameNumber <= 2 || gameNumber === 5;
  const homeTeam = isTeam1Home ? series.team1 : series.team2;
  const awayTeam = isTeam1Home ? series.team2 : series.team1;

  const game = simulatePlayoffGame(homeTeam, awayTeam, gameNumber, stadiumCapacity);

  const newTeam1Wins = series.team1Wins + (game.winnerId === series.team1.id ? 1 : 0);
  const newTeam2Wins = series.team2Wins + (game.winnerId === series.team2.id ? 1 : 0);

  const isSeriesComplete = newTeam1Wins >= SERIES_WINS_NEEDED || newTeam2Wins >= SERIES_WINS_NEEDED;
  const winnerId = isSeriesComplete
    ? (newTeam1Wins >= SERIES_WINS_NEEDED ? series.team1.id : series.team2.id)
    : null;
  const winnerName = isSeriesComplete
    ? (newTeam1Wins >= SERIES_WINS_NEEDED ? series.team1.name : series.team2.name)
    : null;

  return {
    game,
    newTeam1Wins,
    newTeam2Wins,
    isSeriesComplete,
    winnerId,
    winnerName,
  };
}

/**
 * Generate the finals series after semifinals complete
 */
export function generateFinalsSeries(
  bracketId: string,
  semifinal1Winner: { id: string; name: string; seed: number; winPct: number },
  semifinal2Winner: { id: string; name: string; seed: number; winPct: number }
): Omit<PlayoffSeries, 'id'> {
  // Higher seed is team1
  const team1 = semifinal1Winner.seed < semifinal2Winner.seed ? semifinal1Winner : semifinal2Winner;
  const team2 = semifinal1Winner.seed < semifinal2Winner.seed ? semifinal2Winner : semifinal1Winner;

  return {
    bracketId,
    round: 'finals',
    seriesNumber: 1,
    team1: {
      id: team1.id,
      name: team1.name,
      seed: team1.seed,
      wins: 0,
      losses: 0,
      winPct: team1.winPct,
    },
    team2: {
      id: team2.id,
      name: team2.name,
      seed: team2.seed,
      wins: 0,
      losses: 0,
      winPct: team2.winPct,
    },
    team1Wins: 0,
    team2Wins: 0,
    status: 'pending',
    winnerId: null,
    winnerName: null,
    games: [],
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Check if player team made playoffs
 */
export function didPlayerMakePlayoffs(standings: PlayoffStanding[]): boolean {
  return standings.some(s => s.isPlayer);
}

/**
 * Get player's seed in playoffs
 */
export function getPlayerSeed(standings: PlayoffStanding[]): number | null {
  const playerIndex = standings.findIndex(s => s.isPlayer);
  return playerIndex >= 0 ? playerIndex + 1 : null;
}

/**
 * Check if playoffs are complete
 */
export function arePlayoffsComplete(bracket: PlayoffBracket): boolean {
  return bracket.status === 'complete' && bracket.championTeamId !== null;
}

/**
 * Check if player won championship
 */
export function didPlayerWinChampionship(bracket: PlayoffBracket): boolean {
  return bracket.championTeamId === 'player';
}
