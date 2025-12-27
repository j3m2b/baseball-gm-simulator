// ============================================
// Advanced Statistical Mathematics Engine
// Sabermetric formulas for realistic baseball simulation
// ============================================

// ============================================
// TYPES
// ============================================

export interface TeamOffenseDefense {
  offense: number;  // Runs scored potential (based on hitter ratings)
  defense: number;  // Runs allowed potential (based on pitcher ratings)
}

export interface PlateAppearanceOutcome {
  type: 'HOME_RUN' | 'TRIPLE' | 'DOUBLE' | 'SINGLE' | 'WALK' | 'HIT_BY_PITCH' | 'STRIKEOUT' | 'GROUND_OUT' | 'FLY_OUT';
  bases: number;
  isHit: boolean;
  isOut: boolean;
  rbiPotential: number;
}

export interface BatterProbabilities {
  homeRun: number;
  triple: number;
  double: number;
  single: number;
  walk: number;
  hitByPitch: number;
  strikeout: number;
  groundOut: number;
  flyOut: number;
}

export interface GamePlayerStats {
  playerId: string;
  plateAppearances: number;
  atBats: number;
  hits: number;
  singles: number;
  doubles: number;
  triples: number;
  homeRuns: number;
  runs: number;
  rbi: number;
  walks: number;
  strikeouts: number;
  hitByPitch: number;
  stolenBases: number;
  caughtStealing: number;
}

export interface PitcherGameStats {
  playerId: string;
  inningsPitched: number;
  hitsAllowed: number;
  runsAllowed: number;
  earnedRuns: number;
  walks: number;
  strikeouts: number;
  homeRunsAllowed: number;
  pitchCount: number;
  qualityStart: boolean;
  win: boolean;
  loss: boolean;
  save: boolean;
}

export interface GameSimulationResult {
  homeScore: number;
  awayScore: number;
  winner: 'home' | 'away';
  innings: number;
  homePlayerStats: GamePlayerStats[];
  awayPlayerStats: GamePlayerStats[];
  homePitcherStats: PitcherGameStats[];
  awayPitcherStats: PitcherGameStats[];
}

// ============================================
// LEAGUE BASELINE CONSTANTS
// These represent MLB averages for calibration
// ============================================

export const LEAGUE_BASELINES = {
  // Batting averages and rates
  BATTING_AVG: 0.250,          // League average BA
  OBP: 0.320,                  // League average OBP
  SLG: 0.410,                  // League average SLG

  // Hit type distribution (of all hits)
  SINGLE_RATE: 0.66,           // 66% of hits are singles
  DOUBLE_RATE: 0.22,           // 22% of hits are doubles
  TRIPLE_RATE: 0.02,           // 2% of hits are triples
  HOME_RUN_RATE: 0.10,         // 10% of hits are home runs

  // Per-PA rates
  HR_PER_PA: 0.030,            // 3% home run rate
  BB_PER_PA: 0.085,            // 8.5% walk rate
  HBP_PER_PA: 0.010,           // 1% hit by pitch rate
  K_PER_PA: 0.220,             // 22% strikeout rate

  // Game structure
  PA_PER_GAME_TEAM: 38,        // Average plate appearances per team per game
  INNINGS_PER_GAME: 9,

  // Run scoring
  RUNS_PER_GAME: 4.5,          // Average runs per team per game

  // Pitching
  ERA: 4.20,                   // League average ERA
  WHIP: 1.30,                  // League average WHIP
  K_PER_9: 8.5,                // Strikeouts per 9 innings
  BB_PER_9: 3.2,               // Walks per 9 innings

  // Base running
  SB_SUCCESS_RATE: 0.72,       // Stolen base success rate
  SB_ATTEMPT_RATE: 0.06,       // SB attempts per time on base
};

// ============================================
// RANDOM NUMBER GENERATION
// Using Box-Muller for Gaussian distribution
// ============================================

/**
 * Generate a random number from normal distribution
 * Uses Box-Muller transform for true Gaussian randomness
 */
export function randomNormal(mean: number = 0, stdDev: number = 1): number {
  let u1 = Math.random();
  let u2 = Math.random();

  // Avoid log(0)
  while (u1 === 0) u1 = Math.random();

  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return mean + z0 * stdDev;
}

/**
 * Generate a bounded Gaussian random number
 */
export function randomNormalBounded(mean: number, stdDev: number, min: number, max: number): number {
  let value = randomNormal(mean, stdDev);
  return Math.max(min, Math.min(max, value));
}

/**
 * Generate a weighted random choice based on probabilities
 */
export function weightedRandomChoice<T>(choices: { value: T; weight: number }[]): T {
  const totalWeight = choices.reduce((sum, c) => sum + c.weight, 0);
  let random = Math.random() * totalWeight;

  for (const choice of choices) {
    random -= choice.weight;
    if (random <= 0) return choice.value;
  }

  return choices[choices.length - 1].value;
}

// ============================================
// PYTHAGOREAN EXPECTATION
// Bill James formula for win probability
// ============================================

/**
 * Calculate expected win percentage using Pythagorean Expectation
 *
 * Formula: Win% = RS^exp / (RS^exp + RA^exp)
 *
 * The exponent varies:
 * - Original Bill James: 2.0
 * - Pythagenport: 1.83
 * - Pythagenpat: ((RS+RA)/G)^0.287
 *
 * We use a rating-adjusted version for team strength
 */
export function pythagoreanExpectation(
  teamOffense: number,
  teamDefense: number,
  opponentOffense: number,
  opponentDefense: number,
  exponent: number = 2.0
): number {
  // Calculate expected runs scored and allowed
  // Based on team offense vs opponent defense (and vice versa)
  const expectedRunsScored = calculateExpectedRuns(teamOffense, opponentDefense);
  const expectedRunsAllowed = calculateExpectedRuns(opponentOffense, teamDefense);

  // Apply Pythagorean formula
  const rsExp = Math.pow(expectedRunsScored, exponent);
  const raExp = Math.pow(expectedRunsAllowed, exponent);

  return rsExp / (rsExp + raExp);
}

/**
 * Convert team ratings to expected runs
 * Maps the 20-80 rating scale to realistic run production
 */
export function calculateExpectedRuns(offense: number, opposingDefense: number): number {
  // Normalize ratings to a multiplier around 1.0
  // Rating 50 = league average = 1.0 multiplier
  const offenseMultiplier = 0.7 + (offense / 100);  // 0.9 to 1.5
  const defenseMultiplier = 0.7 + (opposingDefense / 100);  // 0.9 to 1.5

  // Base runs is league average
  const baseRuns = LEAGUE_BASELINES.RUNS_PER_GAME;

  // Apply multipliers: better offense scores more, better defense allows fewer
  // We square root the defense multiplier for its inverse effect
  return baseRuns * offenseMultiplier / Math.sqrt(defenseMultiplier);
}

/**
 * Simulate a single game outcome using Pythagorean probability
 */
export function simulateGameOutcome(
  homeTeam: TeamOffenseDefense,
  awayTeam: TeamOffenseDefense
): { homeWins: boolean; homeScore: number; awayScore: number } {
  // Calculate win probability for home team
  const homeWinProb = pythagoreanExpectation(
    homeTeam.offense,
    homeTeam.defense,
    awayTeam.offense,
    awayTeam.defense
  );

  // Add home field advantage (~54% historically)
  const adjustedHomeWinProb = Math.min(0.95, homeWinProb + 0.04);

  // Determine winner
  const homeWins = Math.random() < adjustedHomeWinProb;

  // Generate realistic scores using Poisson-like distribution
  const homeExpectedRuns = calculateExpectedRuns(homeTeam.offense, awayTeam.defense);
  const awayExpectedRuns = calculateExpectedRuns(awayTeam.offense, homeTeam.defense);

  // Use Gaussian with variance to create realistic score spreads
  let homeScore = Math.round(randomNormalBounded(homeExpectedRuns, 2.5, 0, 20));
  let awayScore = Math.round(randomNormalBounded(awayExpectedRuns, 2.5, 0, 20));

  // Ensure the winner actually wins (avoid ties)
  if (homeWins && homeScore <= awayScore) {
    homeScore = awayScore + Math.ceil(Math.random() * 3);
  } else if (!homeWins && awayScore <= homeScore) {
    awayScore = homeScore + Math.ceil(Math.random() * 3);
  }

  return { homeWins, homeScore, awayScore };
}

// ============================================
// LOG5 METHOD
// Batter vs Pitcher confrontation math
// ============================================

/**
 * Log5 Method for head-to-head probability
 *
 * Used to calculate the expected outcome when a specific batter
 * faces a specific pitcher, accounting for both players' true talent
 *
 * Formula: P(batter gets hit) = (Batter_AVG * Pitcher_OppAVG) / League_AVG
 *          / ((Batter_AVG * Pitcher_OppAVG / League_AVG) + ((1-Batter_AVG) * (1-Pitcher_OppAVG) / (1-League_AVG)))
 *
 * Simplified: We use a multiplicative approach
 */
export function log5HitProbability(
  batterHitProb: number,
  pitcherOppHitProb: number,
  leagueAvg: number = LEAGUE_BASELINES.BATTING_AVG
): number {
  // Calculate odds ratios
  const batterOdds = batterHitProb / (1 - batterHitProb);
  const pitcherOdds = pitcherOppHitProb / (1 - pitcherOppHitProb);
  const leagueOdds = leagueAvg / (1 - leagueAvg);

  // Combine using Log5
  const combinedOdds = (batterOdds * pitcherOdds) / leagueOdds;

  // Convert back to probability
  return combinedOdds / (1 + combinedOdds);
}

/**
 * Adjust all batter probabilities based on opposing pitcher
 */
export function adjustProbabilitiesForPitcher(
  batterProbs: BatterProbabilities,
  pitcherStuff: number,
  pitcherControl: number,
  pitcherMovement: number
): BatterProbabilities {
  // Calculate pitcher's overall effectiveness
  const pitcherRating = (pitcherStuff + pitcherControl + pitcherMovement) / 3;

  // Convert pitcher rating to opposing probabilities
  // Higher rating = lower opponent probabilities
  const pitcherOppBA = LEAGUE_BASELINES.BATTING_AVG * (1.3 - (pitcherRating / 100));
  const pitcherOppHR = LEAGUE_BASELINES.HR_PER_PA * (1.4 - (pitcherStuff / 80));
  const pitcherOppBB = LEAGUE_BASELINES.BB_PER_PA * (1.4 - (pitcherControl / 80));
  const pitcherK = LEAGUE_BASELINES.K_PER_PA * (0.6 + (pitcherStuff / 100));

  // Apply Log5 to each probability
  const totalHitProb = batterProbs.single + batterProbs.double + batterProbs.triple + batterProbs.homeRun;
  const adjustedHitProb = log5HitProbability(totalHitProb, pitcherOppBA);
  const hitRatio = adjustedHitProb / totalHitProb;

  return {
    homeRun: log5HitProbability(batterProbs.homeRun, pitcherOppHR),
    triple: batterProbs.triple * hitRatio,
    double: batterProbs.double * hitRatio,
    single: batterProbs.single * hitRatio,
    walk: log5HitProbability(batterProbs.walk, pitcherOppBB, LEAGUE_BASELINES.BB_PER_PA),
    hitByPitch: batterProbs.hitByPitch,  // HBP less affected by matchup
    strikeout: Math.min(0.45, batterProbs.strikeout * (0.8 + pitcherK / LEAGUE_BASELINES.K_PER_PA * 0.4)),
    groundOut: batterProbs.groundOut,
    flyOut: batterProbs.flyOut,
  };
}

// ============================================
// PLAYER PROBABILITY CALCULATION
// Rating-based event probabilities
// ============================================

/**
 * Calculate a batter's probabilities based on their ratings
 *
 * Maps the 20-80 rating scale to realistic MLB statistics:
 * - Rating 20: Worst possible (.180 BA, 5 HR)
 * - Rating 50: League average (.250 BA, 15 HR)
 * - Rating 80: MVP caliber (.330 BA, 45 HR)
 */
export function calculateBatterProbabilities(
  contactRating: number,
  powerRating: number,
  speedRating: number,
  discipline: number = 50  // Plate discipline (hidden or derived)
): BatterProbabilities {
  // Normalize ratings to 0-1 scale (20-80 -> 0-1)
  const contact = (contactRating - 20) / 60;
  const power = (powerRating - 20) / 60;
  const speed = (speedRating - 20) / 60;
  const eye = (discipline - 20) / 60;

  // Calculate hit probability
  // Contact is primary driver, with diminishing returns at extremes
  const baseHitProb = 0.180 + (contact * 0.180);  // .180 to .360
  const hitProbability = baseHitProb * (0.9 + (power * 0.15));  // Power adds slight boost

  // Home run probability (power is primary driver)
  // Rating 20: ~0.5% HR rate, Rating 80: ~8% HR rate
  const hrBase = 0.005 + (power * 0.080);
  const homeRunProb = hrBase * (0.7 + (contact * 0.4));  // Contact helps make solid contact

  // Extra base hit probabilities
  const tripleProb = 0.002 + (speed * 0.015);  // Triples heavily speed-dependent
  const doubleProb = 0.030 + (power * 0.040) + (speed * 0.015);

  // Singles = remaining hits
  const singleProb = Math.max(0.100, hitProbability - homeRunProb - tripleProb - doubleProb);

  // Walk probability (plate discipline + power for pitcher respect)
  const walkProb = 0.050 + (eye * 0.080) + (power * 0.025);

  // Hit by pitch (fairly random, slightly higher for crowders)
  const hbpProb = 0.008 + (Math.random() * 0.008);

  // Strikeout probability (inverse of contact)
  const strikeoutProb = 0.30 - (contact * 0.20) + (power * 0.05);

  // Ground out vs fly out ratio (power = more fly balls)
  const remainingProb = 1 - singleProb - doubleProb - tripleProb - homeRunProb - walkProb - hbpProb - strikeoutProb;
  const groundOutProb = remainingProb * (0.55 - (power * 0.15));
  const flyOutProb = remainingProb - groundOutProb;

  return {
    homeRun: Math.max(0.001, homeRunProb),
    triple: Math.max(0.001, tripleProb),
    double: Math.max(0.010, doubleProb),
    single: Math.max(0.100, singleProb),
    walk: Math.max(0.030, walkProb),
    hitByPitch: Math.max(0.005, hbpProb),
    strikeout: Math.max(0.050, Math.min(0.400, strikeoutProb)),
    groundOut: Math.max(0.050, groundOutProb),
    flyOut: Math.max(0.050, flyOutProb),
  };
}

/**
 * Calculate a pitcher's effectiveness probabilities
 */
export function calculatePitcherProbabilities(
  stuffRating: number,
  controlRating: number,
  movementRating: number
): {
  oppBA: number;
  oppOBP: number;
  kPer9: number;
  bbPer9: number;
  hrPer9: number;
  era: number;
} {
  // Normalize ratings
  const stuff = (stuffRating - 20) / 60;
  const control = (controlRating - 20) / 60;
  const movement = (movementRating - 20) / 60;

  // Opponent batting average (inverse of pitcher quality)
  const oppBA = 0.320 - (stuff * 0.08) - (movement * 0.06) - (control * 0.02);

  // Strikeouts per 9 innings (stuff is primary driver)
  const kPer9 = 4.0 + (stuff * 10.0) + (movement * 2.0);

  // Walks per 9 innings (control is primary driver)
  const bbPer9 = 6.0 - (control * 4.5) - (stuff * 0.5);

  // Home runs per 9 (movement prevents hard contact)
  const hrPer9 = 2.0 - (movement * 1.2) - (stuff * 0.4);

  // Calculate OBP from components
  const oppOBP = oppBA + (bbPer9 / 38) + 0.01;

  // ERA estimation
  const whip = oppBA * 4 + (bbPer9 / 9);
  const era = 2.0 + (oppBA * 15) + (bbPer9 * 0.3) - (kPer9 * 0.1);

  return {
    oppBA: Math.max(0.180, Math.min(0.350, oppBA)),
    oppOBP: Math.max(0.250, Math.min(0.400, oppOBP)),
    kPer9: Math.max(3.0, Math.min(15.0, kPer9)),
    bbPer9: Math.max(0.5, Math.min(8.0, bbPer9)),
    hrPer9: Math.max(0.3, Math.min(3.0, hrPer9)),
    era: Math.max(1.5, Math.min(7.0, era)),
  };
}

// ============================================
// PLATE APPEARANCE SIMULATION
// The core "AB Outcome" Algorithm
// ============================================

/**
 * Simulate a single plate appearance
 *
 * Uses cumulative probability thresholds to determine outcome
 */
export function simulatePlateAppearance(
  batterProbs: BatterProbabilities,
  gameContext?: {
    runnersOnBase: number;
    outs: number;
    inning: number;
    scoreDifferential: number;
  }
): PlateAppearanceOutcome {
  const roll = Math.random();

  // Calculate cumulative thresholds
  let threshold = 0;

  // Home Run
  threshold += batterProbs.homeRun;
  if (roll < threshold) {
    return { type: 'HOME_RUN', bases: 4, isHit: true, isOut: false, rbiPotential: 4 };
  }

  // Triple
  threshold += batterProbs.triple;
  if (roll < threshold) {
    return { type: 'TRIPLE', bases: 3, isHit: true, isOut: false, rbiPotential: 3 };
  }

  // Double
  threshold += batterProbs.double;
  if (roll < threshold) {
    return { type: 'DOUBLE', bases: 2, isHit: true, isOut: false, rbiPotential: 2 };
  }

  // Single
  threshold += batterProbs.single;
  if (roll < threshold) {
    return { type: 'SINGLE', bases: 1, isHit: true, isOut: false, rbiPotential: 1 };
  }

  // Walk
  threshold += batterProbs.walk;
  if (roll < threshold) {
    return { type: 'WALK', bases: 1, isHit: false, isOut: false, rbiPotential: 0 };
  }

  // Hit by Pitch
  threshold += batterProbs.hitByPitch;
  if (roll < threshold) {
    return { type: 'HIT_BY_PITCH', bases: 1, isHit: false, isOut: false, rbiPotential: 0 };
  }

  // Strikeout
  threshold += batterProbs.strikeout;
  if (roll < threshold) {
    return { type: 'STRIKEOUT', bases: 0, isHit: false, isOut: true, rbiPotential: 0 };
  }

  // Ground Out
  threshold += batterProbs.groundOut;
  if (roll < threshold) {
    return { type: 'GROUND_OUT', bases: 0, isHit: false, isOut: true, rbiPotential: 0 };
  }

  // Fly Out (default)
  return { type: 'FLY_OUT', bases: 0, isHit: false, isOut: true, rbiPotential: 0 };
}

// ============================================
// FULL GAME SIMULATION
// Combines all elements for complete game
// ============================================

export interface BatterInfo {
  playerId: string;
  contact: number;
  power: number;
  speed: number;
}

export interface PitcherInfo {
  playerId: string;
  stuff: number;
  control: number;
  movement: number;
}

/**
 * Simulate a complete game with full player statistics
 */
export function simulateFullGame(
  homeBatters: BatterInfo[],
  awayBatters: BatterInfo[],
  homePitchers: PitcherInfo[],
  awayPitchers: PitcherInfo[]
): GameSimulationResult {
  // Initialize stat trackers
  const homeStats = initializePlayerStats(homeBatters);
  const awayStats = initializePlayerStats(awayBatters);
  const homePitcherStats = initializePitcherStats(homePitchers);
  const awayPitcherStats = initializePitcherStats(awayPitchers);

  let homeScore = 0;
  let awayScore = 0;
  let innings = 9;

  // Current pitcher indices
  let homePitcherIdx = 0;
  let awayPitcherIdx = 0;

  // Simulate each half-inning
  for (let inning = 1; inning <= innings; inning++) {
    // Top of inning (away team bats)
    const topResult = simulateHalfInning(
      awayBatters,
      homePitchers[homePitcherIdx],
      awayStats,
      homePitcherStats[homePitcherIdx]
    );
    awayScore += topResult.runs;

    // Check for pitcher change (simplified: change after 6 innings or 100 pitches)
    if (homePitcherStats[homePitcherIdx].pitchCount > 100 && homePitcherIdx < homePitchers.length - 1) {
      homePitcherIdx++;
    }

    // Bottom of inning (home team bats)
    // Skip if home team ahead in 9th or later
    if (inning >= 9 && homeScore > awayScore) {
      break;
    }

    const bottomResult = simulateHalfInning(
      homeBatters,
      awayPitchers[awayPitcherIdx],
      homeStats,
      awayPitcherStats[awayPitcherIdx]
    );
    homeScore += bottomResult.runs;

    // Walk-off check
    if (inning >= 9 && homeScore > awayScore) {
      break;
    }

    // Check for pitcher change
    if (awayPitcherStats[awayPitcherIdx].pitchCount > 100 && awayPitcherIdx < awayPitchers.length - 1) {
      awayPitcherIdx++;
    }

    // Extra innings
    if (inning === 9 && homeScore === awayScore) {
      innings = Math.min(15, innings + 1);  // Cap at 15 innings
    }
  }

  // Assign wins/losses to pitchers
  assignPitcherDecisions(homePitcherStats, awayPitcherStats, homeScore, awayScore);

  return {
    homeScore,
    awayScore,
    winner: homeScore > awayScore ? 'home' : 'away',
    innings,
    homePlayerStats: Object.values(homeStats),
    awayPlayerStats: Object.values(awayStats),
    homePitcherStats: Object.values(homePitcherStats),
    awayPitcherStats: Object.values(awayPitcherStats),
  };
}

function initializePlayerStats(batters: BatterInfo[]): Record<string, GamePlayerStats> {
  const stats: Record<string, GamePlayerStats> = {};
  for (const batter of batters) {
    stats[batter.playerId] = {
      playerId: batter.playerId,
      plateAppearances: 0,
      atBats: 0,
      hits: 0,
      singles: 0,
      doubles: 0,
      triples: 0,
      homeRuns: 0,
      runs: 0,
      rbi: 0,
      walks: 0,
      strikeouts: 0,
      hitByPitch: 0,
      stolenBases: 0,
      caughtStealing: 0,
    };
  }
  return stats;
}

function initializePitcherStats(pitchers: PitcherInfo[]): Record<string, PitcherGameStats> {
  const stats: Record<string, PitcherGameStats> = {};
  for (const pitcher of pitchers) {
    stats[pitcher.playerId] = {
      playerId: pitcher.playerId,
      inningsPitched: 0,
      hitsAllowed: 0,
      runsAllowed: 0,
      earnedRuns: 0,
      walks: 0,
      strikeouts: 0,
      homeRunsAllowed: 0,
      pitchCount: 0,
      qualityStart: false,
      win: false,
      loss: false,
      save: false,
    };
  }
  return stats;
}

interface HalfInningResult {
  runs: number;
  hits: number;
  outs: number;
}

function simulateHalfInning(
  batters: BatterInfo[],
  pitcher: PitcherInfo,
  batterStats: Record<string, GamePlayerStats>,
  pitcherStats: PitcherGameStats
): HalfInningResult {
  let outs = 0;
  let runs = 0;
  let hits = 0;
  let bases = [false, false, false];  // 1st, 2nd, 3rd
  let batterIndex = 0;

  while (outs < 3) {
    const batter = batters[batterIndex % batters.length];
    const stats = batterStats[batter.playerId];

    // Calculate batter probabilities
    const baseProbs = calculateBatterProbabilities(batter.contact, batter.power, batter.speed);

    // Adjust for pitcher
    const adjustedProbs = adjustProbabilitiesForPitcher(
      baseProbs,
      pitcher.stuff,
      pitcher.control,
      pitcher.movement
    );

    // Simulate the PA
    const outcome = simulatePlateAppearance(adjustedProbs);

    // Update stats
    stats.plateAppearances++;
    pitcherStats.pitchCount += Math.floor(randomNormalBounded(4, 1.5, 1, 12));

    if (outcome.isOut) {
      outs++;
      if (outcome.type === 'STRIKEOUT') {
        stats.strikeouts++;
        pitcherStats.strikeouts++;
      }
      stats.atBats++;
    } else {
      if (outcome.isHit) {
        stats.hits++;
        stats.atBats++;
        hits++;
        pitcherStats.hitsAllowed++;

        switch (outcome.type) {
          case 'HOME_RUN':
            stats.homeRuns++;
            pitcherStats.homeRunsAllowed++;
            // Score all runners + batter
            const rbisHR = 1 + bases.filter(b => b).length;
            stats.rbi += rbisHR;
            stats.runs++;
            runs += rbisHR;
            bases = [false, false, false];
            break;
          case 'TRIPLE':
            stats.triples++;
            runs += advanceRunners(bases, 3, stats);
            stats.runs += 0;  // Batter on 3rd, not scored
            bases = [false, false, true];
            break;
          case 'DOUBLE':
            stats.doubles++;
            runs += advanceRunners(bases, 2, stats);
            bases = [false, true, false];
            break;
          case 'SINGLE':
            stats.singles++;
            runs += advanceRunners(bases, 1, stats);
            bases[0] = true;
            break;
        }
      } else {
        // Walk or HBP
        if (outcome.type === 'WALK') {
          stats.walks++;
          pitcherStats.walks++;
        } else {
          stats.hitByPitch++;
        }

        // Advance runners if forced
        if (bases[0]) {
          if (bases[1]) {
            if (bases[2]) {
              runs++;
              stats.rbi++;
            }
            bases[2] = true;
          }
          bases[1] = true;
        }
        bases[0] = true;
      }
    }

    batterIndex++;

    // Safety check to prevent infinite loops
    if (batterIndex > 50) break;
  }

  // Update pitcher stats
  pitcherStats.inningsPitched += 1;
  pitcherStats.runsAllowed += runs;
  pitcherStats.earnedRuns += runs;  // Simplified: all runs are earned

  return { runs, hits, outs };
}

function advanceRunners(bases: boolean[], basesAdvanced: number, batterStats: GamePlayerStats): number {
  let runs = 0;

  // Check each base from 3rd to 1st
  if (bases[2]) {  // Runner on 3rd scores on any hit
    runs++;
    batterStats.rbi++;
    bases[2] = false;
  }

  if (bases[1]) {  // Runner on 2nd
    if (basesAdvanced >= 2) {
      runs++;
      batterStats.rbi++;
      bases[1] = false;
    } else {
      bases[2] = true;
      bases[1] = false;
    }
  }

  if (bases[0]) {  // Runner on 1st
    if (basesAdvanced >= 3) {
      runs++;
      batterStats.rbi++;
      bases[0] = false;
    } else if (basesAdvanced >= 2) {
      bases[2] = true;
      bases[0] = false;
    } else {
      bases[1] = true;
      bases[0] = false;
    }
  }

  return runs;
}

function assignPitcherDecisions(
  homePitchers: Record<string, PitcherGameStats>,
  awayPitchers: Record<string, PitcherGameStats>,
  homeScore: number,
  awayScore: number
): void {
  const homeWon = homeScore > awayScore;

  // Find starting pitchers (most innings)
  const homeStarter = Object.values(homePitchers).reduce((a, b) =>
    a.inningsPitched > b.inningsPitched ? a : b
  );
  const awayStarter = Object.values(awayPitchers).reduce((a, b) =>
    a.inningsPitched > b.inningsPitched ? a : b
  );

  // Simplified win/loss assignment
  if (homeWon) {
    // Home starter gets win if pitched 5+ innings
    if (homeStarter.inningsPitched >= 5) {
      homeStarter.win = true;
      homeStarter.qualityStart = homeStarter.inningsPitched >= 6 && homeStarter.earnedRuns <= 3;
    }
    awayStarter.loss = true;
  } else {
    if (awayStarter.inningsPitched >= 5) {
      awayStarter.win = true;
      awayStarter.qualityStart = awayStarter.inningsPitched >= 6 && awayStarter.earnedRuns <= 3;
    }
    homeStarter.loss = true;
  }
}

// ============================================
// SEASON STAT PROJECTIONS
// Project full season stats from ratings
// ============================================

export interface SeasonProjection {
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
  battingAvg: number;
  obp: number;
  slg: number;
  ops: number;
  war: number;
}

/**
 * Project a full season of stats based on player ratings
 */
export function projectSeasonStats(
  contact: number,
  power: number,
  speed: number,
  games: number = 150,
  paPerGame: number = 4.2
): SeasonProjection {
  const totalPA = Math.round(games * paPerGame);
  const probs = calculateBatterProbabilities(contact, power, speed);

  // Calculate expected stats
  const walks = Math.round(totalPA * probs.walk);
  const hbp = Math.round(totalPA * probs.hitByPitch);
  const atBats = totalPA - walks - hbp;

  const homeRuns = Math.round(totalPA * probs.homeRun);
  const triples = Math.round(totalPA * probs.triple);
  const doubles = Math.round(totalPA * probs.double);
  const singles = Math.round(totalPA * probs.single);
  const hits = singles + doubles + triples + homeRuns;

  const strikeouts = Math.round(totalPA * probs.strikeout);

  // Speed-based stats
  const sbAttempts = Math.round((walks + hbp + singles) * LEAGUE_BASELINES.SB_ATTEMPT_RATE * (1 + (speed - 50) / 50));
  const stolenBases = Math.round(sbAttempts * (LEAGUE_BASELINES.SB_SUCCESS_RATE + (speed - 50) / 200));

  // Run production estimates
  const totalBases = singles + (doubles * 2) + (triples * 3) + (homeRuns * 4);
  const runs = Math.round(0.9 * (hits + walks + hbp) * (0.3 + (speed / 200)));
  const rbi = Math.round(0.25 * totalBases + 0.1 * (hits + walks));

  // Calculate rate stats
  const battingAvg = hits / atBats;
  const obp = (hits + walks + hbp) / totalPA;
  const slg = totalBases / atBats;
  const ops = obp + slg;

  // Simplified WAR calculation
  const war = ((ops - 0.700) * atBats / 600) * 4 + (stolenBases * 0.02) + ((speed - 50) / 50);

  return {
    games,
    plateAppearances: totalPA,
    atBats,
    hits,
    doubles,
    triples,
    homeRuns,
    runs,
    rbi,
    walks,
    strikeouts,
    stolenBases,
    battingAvg: Math.round(battingAvg * 1000) / 1000,
    obp: Math.round(obp * 1000) / 1000,
    slg: Math.round(slg * 1000) / 1000,
    ops: Math.round(ops * 1000) / 1000,
    war: Math.round(war * 10) / 10,
  };
}

// ============================================
// RATING VALIDATION
// Ensure ratings produce expected stat ranges
// ============================================

export interface RatingValidation {
  rating: number;
  expectedBA: string;
  expectedHR: number;
  expectedOPS: string;
  playerType: string;
}

/**
 * Validate that our rating system produces expected stat ranges
 */
export function validateRatingScale(): RatingValidation[] {
  const validations: RatingValidation[] = [];

  const ratings = [20, 30, 40, 50, 60, 70, 80];
  const playerTypes = [
    'Replacement Level',
    'Below Average',
    'Fringe Starter',
    'League Average',
    'Above Average',
    'All-Star',
    'MVP Caliber'
  ];

  for (let i = 0; i < ratings.length; i++) {
    const rating = ratings[i];
    const projection = projectSeasonStats(rating, rating, rating);

    validations.push({
      rating,
      expectedBA: projection.battingAvg.toFixed(3),
      expectedHR: projection.homeRuns,
      expectedOPS: projection.ops.toFixed(3),
      playerType: playerTypes[i],
    });
  }

  return validations;
}
