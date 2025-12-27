// ============================================
// Box Score Simulation Engine
// Generates detailed per-game statistics
// ============================================

import type {
  BatterBoxScore,
  PitcherBoxScore,
  Position,
  AI_TEAMS,
} from '@/lib/types';

// ============================================
// TYPES
// ============================================

interface PlayerRosterEntry {
  id: string;
  firstName: string;
  lastName: string;
  position: Position;
  playerType: 'HITTER' | 'PITCHER';
  currentRating: number;
}

interface SimulatedGameResult {
  isWin: boolean;
  playerRuns: number;
  opponentRuns: number;
  playerLineScore: number[];
  opponentLineScore: number[];
  playerHits: number;
  playerErrors: number;
  opponentHits: number;
  opponentErrors: number;
  battingStats: BatterBoxScore[];
  pitchingStats: PitcherBoxScore[];
  attendance: number;
  gameDurationMinutes: number;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Random integer between min and max (inclusive)
 */
function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Weighted random based on rating (higher rating = better outcome)
 */
function weightedRandom(rating: number, base: number, range: number): number {
  const modifier = (rating - 50) / 50; // -0.6 to 0.6 range
  return Math.max(0, Math.round(base + range * modifier + (Math.random() * range * 0.5 - range * 0.25)));
}

/**
 * Generate a random opponent from AI teams
 */
export function getRandomOpponent(): { name: string; city: string } {
  const opponents = [
    { name: 'Hammers', city: 'Steel City' },
    { name: 'Rapids', city: 'River City' },
    { name: 'Coyotes', city: 'Canyon Town' },
    { name: 'Sailors', city: 'Port City' },
    { name: 'Foresters', city: 'Forest City' },
    { name: 'Vultures', city: 'Valley Town' },
    { name: 'Miners', city: 'Coaltown' },
    { name: 'Mountaineers', city: 'Mountain Town' },
    { name: 'Scorpions', city: 'Desert Springs' },
    { name: 'Lakers', city: 'Lakeside' },
    { name: 'Buccaneers', city: 'Bay City' },
    { name: 'Pioneers', city: 'Prairie Plains' },
    { name: 'Hawks', city: 'Summit Heights' },
    { name: 'Royals', city: 'Riverside' },
    { name: 'Cardinals', city: 'Crossroads' },
    { name: 'Ironmen', city: 'Ironworks' },
    { name: 'Hurricanes', city: 'Harbor Town' },
    { name: 'Meteors', city: 'Metro City' },
    { name: 'Condors', city: 'Central Valley' },
  ];
  return opponents[Math.floor(Math.random() * opponents.length)];
}

// ============================================
// LINE SCORE GENERATION
// ============================================

/**
 * Generate a realistic line score for a team
 * @param totalRuns - Total runs to distribute across innings
 * @param innings - Number of innings (usually 9)
 */
function generateLineScore(totalRuns: number, innings: number = 9): number[] {
  const lineScore: number[] = new Array(innings).fill(0);
  let remaining = totalRuns;

  // Big innings are less common - use weighted distribution
  while (remaining > 0) {
    const inning = Math.floor(Math.random() * innings);
    const runsThisInning = Math.random() < 0.7 ? 1 : randInt(2, Math.min(4, remaining));
    lineScore[inning] += Math.min(runsThisInning, remaining);
    remaining -= Math.min(runsThisInning, remaining);
  }

  return lineScore;
}

// ============================================
// BATTER STATS GENERATION
// ============================================

/**
 * Generate realistic batting stats for a lineup
 */
function generateBattingStats(
  roster: PlayerRosterEntry[],
  totalRuns: number,
  totalHits: number,
  isWin: boolean
): BatterBoxScore[] {
  const hitters = roster.filter(p => p.playerType === 'HITTER');
  if (hitters.length === 0) return [];

  // Create lineup (up to 9 batters)
  const lineup = hitters.slice(0, 9);
  const stats: BatterBoxScore[] = [];

  let runsRemaining = totalRuns;
  let hitsRemaining = totalHits;
  let homeRunsTotal = 0;

  // Determine total home runs based on run environment
  if (totalRuns >= 5) {
    homeRunsTotal = randInt(1, Math.min(3, Math.floor(totalRuns / 3)));
  } else if (totalRuns >= 2 && Math.random() < 0.4) {
    homeRunsTotal = 1;
  }

  // Distribute stats among batters
  lineup.forEach((player, index) => {
    const battingOrder = index + 1;
    const ab = randInt(3, 5); // 3-5 at-bats per game

    // Higher rated players get more hits
    const hitChance = 0.2 + (player.currentRating - 30) / 200; // 0.2 to 0.45
    let h = 0;
    let hr = 0;
    let doubles = 0;
    let triples = 0;

    // Distribute hits based on rating and remaining
    if (hitsRemaining > 0) {
      const expectedHits = Math.round(ab * hitChance);
      h = Math.min(expectedHits, hitsRemaining, ab);
      hitsRemaining -= h;
    }

    // Home runs for power hitters
    if (h > 0 && homeRunsTotal > 0 && Math.random() < 0.3) {
      hr = Math.min(randInt(1, 2), h, homeRunsTotal);
      homeRunsTotal -= hr;
    }

    // Extra base hits
    if (h > hr) {
      const remainingHits = h - hr;
      if (remainingHits > 0 && Math.random() < 0.3) {
        doubles = Math.min(randInt(1, 2), remainingHits);
      }
      if (remainingHits > doubles && Math.random() < 0.05) {
        triples = 1;
      }
    }

    // Runs scored
    const r = runsRemaining > 0 ? Math.min(randInt(0, 2), runsRemaining) : 0;
    runsRemaining -= r;

    // RBI calculation
    const rbi = hr * randInt(1, 2) + (h > hr ? randInt(0, 1) : 0);

    // Walks and strikeouts
    const bb = Math.random() < 0.1 ? 1 : 0;
    const so = Math.random() < 0.25 ? randInt(1, 2) : 0;

    // Stolen bases (speed players)
    const sb = h > 0 && Math.random() < 0.1 ? 1 : 0;

    stats.push({
      playerId: player.id,
      name: `${player.firstName} ${player.lastName}`,
      position: player.position,
      battingOrder,
      ab,
      r,
      h,
      doubles,
      triples,
      hr,
      rbi,
      bb,
      so,
      sb,
      avg: ab > 0 ? h / ab : 0,
    });
  });

  // Ensure we have distributed all runs
  if (runsRemaining > 0 && stats.length > 0) {
    for (let i = 0; i < runsRemaining && i < stats.length; i++) {
      stats[i].r += 1;
    }
  }

  return stats;
}

// ============================================
// PITCHER STATS GENERATION
// ============================================

/**
 * Generate realistic pitching stats
 */
function generatePitchingStats(
  roster: PlayerRosterEntry[],
  opponentRuns: number,
  opponentHits: number,
  isWin: boolean
): PitcherBoxScore[] {
  const pitchers = roster.filter(p => p.playerType === 'PITCHER');
  if (pitchers.length === 0) return [];

  const stats: PitcherBoxScore[] = [];

  // Find starters and relievers
  const starters = pitchers.filter(p => p.position === 'SP');
  const relievers = pitchers.filter(p => p.position === 'RP');

  let inningsRemaining = 9;
  let runsRemaining = opponentRuns;
  let hitsRemaining = opponentHits;

  // Starting pitcher
  if (starters.length > 0) {
    const starter = starters[0];
    const quality = starter.currentRating;

    // Better pitchers go longer
    const ip = Math.min(
      9,
      quality >= 60 ? randInt(6, 8) : quality >= 45 ? randInt(5, 7) : randInt(4, 6)
    );

    inningsRemaining -= ip;

    // Distribute runs against starter
    const starterRuns = Math.min(
      runsRemaining,
      Math.round(runsRemaining * (ip / 9) * (1 + (50 - quality) / 100))
    );
    runsRemaining -= starterRuns;

    // Hits against starter
    const starterHits = Math.min(
      hitsRemaining,
      Math.round(hitsRemaining * (ip / 9))
    );
    hitsRemaining -= starterHits;

    // Calculate strikeouts and walks
    const soRate = (quality - 30) / 100; // 0.1 to 0.5
    const so = Math.round(ip * 3 * soRate); // ~0.3 to 1.5 K per inning
    const bb = randInt(1, Math.max(1, 5 - Math.floor(quality / 20)));
    const hr = starterRuns >= 2 && Math.random() < 0.4 ? randInt(1, 2) : 0;

    // Pitch count
    const pitchCount = Math.round(ip * (14 + Math.random() * 4));

    stats.push({
      playerId: starter.id,
      name: `${starter.firstName} ${starter.lastName}`,
      ip,
      h: starterHits,
      r: starterRuns,
      er: Math.max(0, starterRuns - (Math.random() < 0.1 ? 1 : 0)), // Unearned runs rare
      bb,
      so,
      hr,
      pitchCount,
      strikes: Math.round(pitchCount * 0.62),
      isWin: isWin && ip >= 5,
      isLoss: !isWin && starterRuns > 0,
      isSave: false,
      isHold: false,
      era: ip > 0 ? (starterRuns * 9) / ip : 0,
    });
  }

  // Relievers
  let relieverIndex = 0;
  while (inningsRemaining > 0 && relieverIndex < relievers.length) {
    const reliever = relievers[relieverIndex];
    const ip = Math.min(inningsRemaining, randInt(1, 2));
    inningsRemaining -= ip;

    const relieverRuns = Math.min(runsRemaining, Math.random() < 0.7 ? 0 : randInt(1, 2));
    runsRemaining -= relieverRuns;

    const relieverHits = Math.min(hitsRemaining, randInt(0, 2));
    hitsRemaining -= relieverHits;

    const so = Math.random() < 0.6 ? randInt(1, 3) : 0;
    const bb = Math.random() < 0.3 ? 1 : 0;
    const pitchCount = Math.round(ip * (15 + Math.random() * 5));

    // Save opportunity: 9th inning, leading by 3 or less
    const isSaveOpportunity = inningsRemaining === 0 && isWin && relieverRuns <= 1;

    stats.push({
      playerId: reliever.id,
      name: `${reliever.firstName} ${reliever.lastName}`,
      ip,
      h: relieverHits,
      r: relieverRuns,
      er: relieverRuns,
      bb,
      so,
      hr: 0,
      pitchCount,
      strikes: Math.round(pitchCount * 0.65),
      isWin: false,
      isLoss: !isWin && inningsRemaining === 0 && relieverRuns > 0,
      isSave: isSaveOpportunity,
      isHold: !isSaveOpportunity && relieverRuns === 0 && ip > 0,
      era: ip > 0 ? (relieverRuns * 9) / ip : 0,
    });

    relieverIndex++;
  }

  return stats;
}

// ============================================
// MAIN SIMULATION FUNCTION
// ============================================

/**
 * Simulate a single game and generate full box score
 */
export function simulateGame(
  roster: PlayerRosterEntry[],
  teamRating: number,
  opponentRating: number,
  isHome: boolean,
  stadiumCapacity: number,
  cityPride: number
): SimulatedGameResult {
  // Calculate win probability
  const ratingDiff = teamRating - opponentRating;
  const homeAdvantage = isHome ? 5 : 0;
  const winProb = 0.5 + (ratingDiff + homeAdvantage) / 100;
  const clampedProb = Math.max(0.25, Math.min(0.75, winProb));

  const isWin = Math.random() < clampedProb;

  // Generate runs based on team strength and game outcome
  const baseRuns = 4 + (teamRating - 40) / 20; // 3-6 base runs
  const playerRuns = isWin
    ? randInt(Math.round(baseRuns), Math.round(baseRuns + 4))
    : randInt(Math.max(0, Math.round(baseRuns - 2)), Math.round(baseRuns + 1));

  const opponentRuns = isWin
    ? randInt(0, playerRuns - 1)
    : randInt(playerRuns + 1, playerRuns + 5);

  // Generate hits (roughly runs * 1.5-2)
  const playerHits = Math.max(playerRuns, randInt(playerRuns + 2, playerRuns + 8));
  const opponentHits = Math.max(opponentRuns, randInt(opponentRuns + 2, opponentRuns + 6));

  // Errors (0-2 per team typically)
  const playerErrors = Math.random() < 0.3 ? randInt(1, 2) : 0;
  const opponentErrors = Math.random() < 0.3 ? randInt(1, 2) : 0;

  // Generate line scores
  const playerLineScore = generateLineScore(playerRuns);
  const opponentLineScore = generateLineScore(opponentRuns);

  // Generate individual stats
  const battingStats = generateBattingStats(roster, playerRuns, playerHits, isWin);
  const pitchingStats = generatePitchingStats(roster, opponentRuns, opponentHits, isWin);

  // Attendance calculation
  const baseAttendance = stadiumCapacity * 0.4;
  const prideMultiplier = 0.7 + (cityPride / 100) * 0.8;
  const variance = 0.85 + Math.random() * 0.3;
  const attendance = Math.min(
    stadiumCapacity,
    Math.round(baseAttendance * prideMultiplier * variance)
  );

  // Game duration (2:30 to 3:30)
  const gameDurationMinutes = randInt(150, 210);

  return {
    isWin,
    playerRuns,
    opponentRuns,
    playerLineScore,
    opponentLineScore,
    playerHits,
    playerErrors,
    opponentHits,
    opponentErrors,
    battingStats,
    pitchingStats,
    attendance,
    gameDurationMinutes,
  };
}

/**
 * Generate multiple game simulations for batch processing
 */
export function simulateGameBatch(
  roster: PlayerRosterEntry[],
  teamRating: number,
  opponentRating: number,
  stadiumCapacity: number,
  cityPride: number,
  count: number,
  startGameNumber: number,
  teamName: string,
  year: number
): {
  games: Array<{
    gameNumber: number;
    opponent: { name: string; city: string };
    isHome: boolean;
    result: SimulatedGameResult;
  }>;
  totalWins: number;
  totalLosses: number;
  totalAttendance: number;
  homeGames: number;
} {
  const games: Array<{
    gameNumber: number;
    opponent: { name: string; city: string };
    isHome: boolean;
    result: SimulatedGameResult;
  }> = [];

  let totalWins = 0;
  let totalLosses = 0;
  let totalAttendance = 0;
  let homeGames = 0;

  for (let i = 0; i < count; i++) {
    const gameNumber = startGameNumber + i;
    const isHome = Math.random() < 0.5;
    const opponent = getRandomOpponent();

    // Vary opponent strength slightly
    const gameOpponentRating = opponentRating + randInt(-5, 5);

    const result = simulateGame(
      roster,
      teamRating,
      gameOpponentRating,
      isHome,
      stadiumCapacity,
      cityPride
    );

    games.push({
      gameNumber,
      opponent,
      isHome,
      result,
    });

    if (result.isWin) totalWins++;
    else totalLosses++;

    if (isHome) {
      homeGames++;
      totalAttendance += result.attendance;
    }
  }

  return {
    games,
    totalWins,
    totalLosses,
    totalAttendance,
    homeGames,
  };
}
