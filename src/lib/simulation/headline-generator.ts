// ============================================
// Dynamic Narrative Engine - Headline Generator
// ============================================
// Generates news stories and headlines based on game events

import type {
  NewsStory,
  NewsStoryType,
  NewsPriority,
  GameResultData,
  PlayerGamePerformance,
  CityEventData,
  DistrictType,
} from '@/lib/types';

// ============================================
// HEADLINE TEMPLATES
// ============================================

// Game result headlines
const WIN_HEADLINES = [
  '{teamName} takes down opponents in {location} showdown',
  'Victory! {teamName} improves to {wins}-{losses}',
  '{teamName} cruises to {runsScored}-{runsAllowed} victory',
  '{location} crowd celebrates as {teamName} wins',
  '{teamName} keeps rolling with another win',
];

const LOSS_HEADLINES = [
  '{teamName} falls short in {location} matchup',
  'Tough loss: {teamName} drops to {wins}-{losses}',
  '{teamName} stumbles, losing {runsAllowed}-{runsScored}',
  'Opponents hand {teamName} a defeat',
  '{teamName} unable to find offense in loss',
];

const BLOWOUT_WIN_HEADLINES = [
  'Dominant! {teamName} crushes opponents {runsScored}-{runsAllowed}',
  '{teamName} explodes for {runsScored} runs in rout',
  'No contest: {teamName} demolishes opposition',
];

const BLOWOUT_LOSS_HEADLINES = [
  'Rough night: {teamName} gets blown out {runsAllowed}-{runsScored}',
  '{teamName} suffers lopsided {runsAllowed}-{runsScored} defeat',
  'Nightmare game as {teamName} gets crushed',
];

const SHUTOUT_WIN_HEADLINES = [
  'Pitching gem! {teamName} blanks opponents {runsScored}-0',
  '{teamName} pitchers combine for shutout victory',
  'Dominant pitching leads {teamName} to {runsScored}-0 win',
];

const SHUTOUT_LOSS_HEADLINES = [
  '{teamName} offense goes silent in shutout loss',
  'Zero runs: {teamName} gets blanked by opponents',
  '{teamName} bats stay cold in scoreless defeat',
];

// Win/Loss streak headlines
const WIN_STREAK_HEADLINES: Record<number, string[]> = {
  3: [
    'Hot streak! {teamName} wins 3 in a row',
    '{teamName} makes it three straight victories',
  ],
  5: [
    'Unstoppable! {teamName} extends win streak to 5',
    'On fire: {teamName} rolls to 5th consecutive win',
    '{teamName} can\'t be stopped, now 5-0 in last 5',
  ],
  7: [
    'Red hot! {teamName} wins 7 straight games',
    'Historic run: {teamName} extends streak to 7 wins',
  ],
  10: [
    'Incredible! {teamName} reaches 10-game win streak',
    'Dynasty in the making? {teamName} wins 10 in a row',
  ],
};

const LOSS_STREAK_HEADLINES: Record<number, string[]> = {
  3: [
    'Struggling: {teamName} drops 3rd straight game',
    '{teamName} looking for answers after 3 consecutive losses',
  ],
  5: [
    'Skid continues: {teamName} loses 5 in a row',
    '{teamName} mired in 5-game losing streak',
  ],
  7: [
    'Crisis mode: {teamName} suffers 7th straight loss',
    'Dark times for {teamName} as skid reaches 7 games',
  ],
};

// Player performance headlines
const MULTI_HR_HEADLINES = [
  'Slugfest! {playerName} crushes {homeRuns} homers in win',
  '{playerName} goes yard {homeRuns} times in big night',
  'Power display: {playerName} belts {homeRuns} home runs',
];

const HIGH_STRIKEOUT_HEADLINES = [
  'Ace material: {playerName} fans {strikeouts} batters',
  '{playerName} dominates with {strikeouts}-strikeout performance',
  'Unhittable: {playerName} racks up {strikeouts} Ks',
];

const SHUTOUT_PITCHER_HEADLINES = [
  'Masterpiece: {playerName} tosses shutout',
  '{playerName} throws gem, blanks opponents',
  'Shutout artist: {playerName} dominates from start to finish',
];

const CYCLE_HEADLINES = [
  'Historic night! {playerName} hits for the cycle',
  '{playerName} achieves rare feat with cycle',
];

const GRAND_SLAM_HEADLINES = [
  'Grand slam! {playerName} clears the bases',
  '{playerName} delivers clutch grand slam',
];

// City event headlines
const CITY_HEADLINES: Record<string, string[]> = {
  DISTRICT_UPGRADE: [
    'City Boom: New {districtType} zone attracts investors',
    'Economic surge: {districtType} district expands',
    '{districtType} development brings new opportunities',
  ],
  POPULATION_MILESTONE: [
    'Growing city: Population reaches {milestone}',
    'Boom town: {milestone} residents and counting',
  ],
  BUILDING_LANDMARK: [
    '{buildingName} achieves landmark status',
    'Pride of the city: {buildingName} becomes iconic',
  ],
  PRIDE_MILESTONE: [
    'City pride soars to {milestone}%',
    'Fan fervor: Team pride hits {milestone}%',
  ],
};

// Milestone headlines
const MILESTONE_HEADLINES = {
  WINS_10: [
    '{teamName} reaches 10-win milestone',
    'Double digits: {teamName} notches 10th victory',
  ],
  WINS_25: [
    '{teamName} hits 25 wins on the season',
    'Quarter century: {teamName} earns 25th win',
  ],
  WINS_50: [
    'Halfway to 100! {teamName} reaches 50 wins',
    'Dominant season: {teamName} claims 50th victory',
  ],
  FIRST_PLACE: [
    '{teamName} moves into first place!',
    'Top of the standings: {teamName} takes the lead',
  ],
  PLAYOFFS_CLINCH: [
    '{teamName} clinches playoff berth!',
    'Postseason bound: {teamName} locks up playoff spot',
  ],
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

function generateId(): string {
  return `news_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function formatHeadline(
  template: string,
  data: Record<string, string | number>
): string {
  let result = template;
  for (const [key, value] of Object.entries(data)) {
    result = result.replace(new RegExp(`{${key}}`, 'g'), String(value));
  }
  return result;
}

function getDistrictDisplayName(district: DistrictType): string {
  const names: Record<DistrictType, string> = {
    COMMERCIAL: 'Commercial',
    ENTERTAINMENT: 'Entertainment',
    PERFORMANCE: 'Performance',
  };
  return names[district] || district;
}

// ============================================
// HEADLINE GENERATION FUNCTIONS
// ============================================

export interface HeadlineContext {
  teamName: string;
  year: number;
  currentWins: number;
  currentLosses: number;
}

/**
 * Generate headlines from a game result
 */
export function generateGameHeadlines(
  gameResult: GameResultData,
  context: HeadlineContext
): NewsStory[] {
  const stories: NewsStory[] = [];
  const { gameNumber, isWin, isHome, runsScored, runsAllowed, winStreak, lossStreak, playerPerformances } = gameResult;
  const { teamName, year, currentWins, currentLosses } = context;

  const location = isHome ? 'home' : 'away';
  const margin = Math.abs(runsScored - runsAllowed);
  const isBlowout = margin >= 5;
  const isShutout = (isWin && runsAllowed === 0) || (!isWin && runsScored === 0);

  const baseData = {
    teamName,
    wins: currentWins,
    losses: currentLosses,
    runsScored,
    runsAllowed,
    location,
  };

  // Main game result headline
  let mainHeadline: string;
  let priority: NewsPriority = 'LOW';

  if (isWin) {
    if (isShutout) {
      mainHeadline = formatHeadline(pickRandom(SHUTOUT_WIN_HEADLINES), baseData);
      priority = 'HIGH';
    } else if (isBlowout) {
      mainHeadline = formatHeadline(pickRandom(BLOWOUT_WIN_HEADLINES), baseData);
    } else {
      mainHeadline = formatHeadline(pickRandom(WIN_HEADLINES), baseData);
    }
  } else {
    if (isShutout) {
      mainHeadline = formatHeadline(pickRandom(SHUTOUT_LOSS_HEADLINES), baseData);
    } else if (isBlowout) {
      mainHeadline = formatHeadline(pickRandom(BLOWOUT_LOSS_HEADLINES), baseData);
    } else {
      mainHeadline = formatHeadline(pickRandom(LOSS_HEADLINES), baseData);
    }
  }

  stories.push({
    id: generateId(),
    date: new Date().toISOString(),
    headline: mainHeadline,
    type: 'GAME_RESULT',
    priority,
    year,
    gameNumber,
    imageIcon: isWin ? 'trophy' : 'baseball',
  });

  // Win/Loss streak headlines
  if (winStreak >= 3 && WIN_STREAK_HEADLINES[winStreak]) {
    const streakHeadline = formatHeadline(pickRandom(WIN_STREAK_HEADLINES[winStreak]), baseData);
    stories.push({
      id: generateId(),
      date: new Date().toISOString(),
      headline: streakHeadline,
      type: 'MILESTONE',
      priority: winStreak >= 5 ? 'HIGH' : 'LOW',
      year,
      gameNumber,
      imageIcon: 'fire',
    });
  }

  if (lossStreak >= 3 && LOSS_STREAK_HEADLINES[lossStreak]) {
    const streakHeadline = formatHeadline(pickRandom(LOSS_STREAK_HEADLINES[lossStreak]), baseData);
    stories.push({
      id: generateId(),
      date: new Date().toISOString(),
      headline: streakHeadline,
      type: 'MILESTONE',
      priority: lossStreak >= 5 ? 'HIGH' : 'LOW',
      year,
      gameNumber,
      imageIcon: 'warning',
    });
  }

  // Player performance headlines
  for (const perf of playerPerformances) {
    const playerStories = generatePlayerPerformanceHeadlines(perf, year, gameNumber);
    stories.push(...playerStories);
  }

  return stories;
}

/**
 * Generate headlines from player performance
 */
export function generatePlayerPerformanceHeadlines(
  performance: PlayerGamePerformance,
  year: number,
  gameNumber?: number
): NewsStory[] {
  const stories: NewsStory[] = [];
  const { playerId, playerName, playerType } = performance;

  // Batter performance
  if (playerType === 'HITTER') {
    // Multi-HR game (2+)
    if (performance.homeRuns && performance.homeRuns >= 2) {
      stories.push({
        id: generateId(),
        date: new Date().toISOString(),
        headline: formatHeadline(pickRandom(MULTI_HR_HEADLINES), {
          playerName,
          homeRuns: performance.homeRuns,
        }),
        type: 'MILESTONE',
        priority: 'HIGH',
        year,
        gameNumber,
        playerId,
        playerName,
        imageIcon: 'star',
      });
    }

    // Cycle (single, double, triple, HR in same game) - rare!
    // This would need hits broken down, but we can check for 4+ hits with HR
    if (performance.hits && performance.hits >= 4 && performance.homeRuns && performance.homeRuns >= 1) {
      // Small chance it's a cycle (simplified check)
      if (Math.random() < 0.1) {
        stories.push({
          id: generateId(),
          date: new Date().toISOString(),
          headline: formatHeadline(pickRandom(CYCLE_HEADLINES), { playerName }),
          type: 'MILESTONE',
          priority: 'HIGH',
          year,
          gameNumber,
          playerId,
          playerName,
          imageIcon: 'diamond',
        });
      }
    }

    // Grand slam (RBI 4+ with HR)
    if (performance.rbi && performance.rbi >= 4 && performance.homeRuns && performance.homeRuns >= 1) {
      stories.push({
        id: generateId(),
        date: new Date().toISOString(),
        headline: formatHeadline(pickRandom(GRAND_SLAM_HEADLINES), { playerName }),
        type: 'GAME_RESULT',
        priority: 'HIGH',
        year,
        gameNumber,
        playerId,
        playerName,
        imageIcon: 'explosion',
      });
    }
  }

  // Pitcher performance
  if (playerType === 'PITCHER') {
    // High strikeout game (10+)
    if (performance.pitcherStrikeouts && performance.pitcherStrikeouts >= 10) {
      stories.push({
        id: generateId(),
        date: new Date().toISOString(),
        headline: formatHeadline(pickRandom(HIGH_STRIKEOUT_HEADLINES), {
          playerName,
          strikeouts: performance.pitcherStrikeouts,
        }),
        type: 'MILESTONE',
        priority: 'HIGH',
        year,
        gameNumber,
        playerId,
        playerName,
        imageIcon: 'arm',
      });
    }

    // Complete game shutout
    if (
      performance.inningsPitched &&
      performance.inningsPitched >= 9 &&
      performance.earnedRuns === 0
    ) {
      stories.push({
        id: generateId(),
        date: new Date().toISOString(),
        headline: formatHeadline(pickRandom(SHUTOUT_PITCHER_HEADLINES), { playerName }),
        type: 'MILESTONE',
        priority: 'HIGH',
        year,
        gameNumber,
        playerId,
        playerName,
        imageIcon: 'crown',
      });
    }
  }

  return stories;
}

/**
 * Generate headlines from city events
 */
export function generateCityHeadlines(
  cityEvent: CityEventData,
  year: number
): NewsStory[] {
  const stories: NewsStory[] = [];
  const templates = CITY_HEADLINES[cityEvent.type];

  if (!templates) return stories;

  const data: Record<string, string | number> = {};

  if (cityEvent.districtType) {
    data.districtType = getDistrictDisplayName(cityEvent.districtType);
  }
  if (cityEvent.buildingName) {
    data.buildingName = cityEvent.buildingName;
  }
  if (cityEvent.milestone) {
    data.milestone = cityEvent.milestone.toLocaleString();
  }

  const headline = formatHeadline(pickRandom(templates), data);

  stories.push({
    id: generateId(),
    date: new Date().toISOString(),
    headline,
    type: 'CITY',
    priority: cityEvent.type === 'BUILDING_LANDMARK' ? 'HIGH' : 'LOW',
    year,
    imageIcon: 'city',
  });

  return stories;
}

/**
 * Generate milestone headlines based on season progress
 */
export function generateMilestoneHeadlines(
  context: HeadlineContext & {
    previousWins: number;
    divisionRank: number;
    previousDivisionRank: number;
    madePlayoffs: boolean;
    previouslyMadePlayoffs: boolean;
  }
): NewsStory[] {
  const stories: NewsStory[] = [];
  const { teamName, year, currentWins, previousWins, divisionRank, previousDivisionRank, madePlayoffs, previouslyMadePlayoffs } = context;

  // Win milestones
  const winMilestones = [10, 25, 50, 75, 100];
  for (const milestone of winMilestones) {
    if (previousWins < milestone && currentWins >= milestone) {
      const templates = MILESTONE_HEADLINES[`WINS_${milestone}` as keyof typeof MILESTONE_HEADLINES];
      if (templates) {
        stories.push({
          id: generateId(),
          date: new Date().toISOString(),
          headline: formatHeadline(pickRandom(templates), { teamName }),
          type: 'MILESTONE',
          priority: milestone >= 50 ? 'HIGH' : 'LOW',
          year,
          imageIcon: 'trophy',
        });
      }
    }
  }

  // First place
  if (previousDivisionRank !== 1 && divisionRank === 1) {
    stories.push({
      id: generateId(),
      date: new Date().toISOString(),
      headline: formatHeadline(pickRandom(MILESTONE_HEADLINES.FIRST_PLACE), { teamName }),
      type: 'MILESTONE',
      priority: 'HIGH',
      year,
      imageIcon: 'medal',
    });
  }

  // Playoffs clinched
  if (!previouslyMadePlayoffs && madePlayoffs) {
    stories.push({
      id: generateId(),
      date: new Date().toISOString(),
      headline: formatHeadline(pickRandom(MILESTONE_HEADLINES.PLAYOFFS_CLINCH), { teamName }),
      type: 'MILESTONE',
      priority: 'HIGH',
      year,
      imageIcon: 'party',
    });
  }

  return stories;
}

/**
 * Generate transaction headlines (trades, signings, releases)
 */
export function generateTransactionHeadline(
  transactionType: 'SIGNED' | 'RELEASED' | 'TRADED' | 'PROMOTED' | 'DEMOTED',
  playerName: string,
  details: string,
  year: number
): NewsStory {
  const templates: Record<string, string[]> = {
    SIGNED: [
      '{playerName} signs with the team',
      'New addition: {playerName} joins the roster',
    ],
    RELEASED: [
      '{playerName} released from roster',
      'Team parts ways with {playerName}',
    ],
    TRADED: [
      '{playerName} traded in blockbuster deal',
      'Trade alert: {playerName} on the move',
    ],
    PROMOTED: [
      '{playerName} called up to active roster',
      'Promotion: {playerName} gets the call',
    ],
    DEMOTED: [
      '{playerName} optioned to reserve roster',
      '{playerName} sent down for development',
    ],
  };

  const headline = formatHeadline(pickRandom(templates[transactionType] || templates.SIGNED), { playerName });

  return {
    id: generateId(),
    date: new Date().toISOString(),
    headline,
    type: 'TRANSACTION',
    priority: transactionType === 'TRADED' ? 'HIGH' : 'LOW',
    year,
    playerName,
    imageIcon: transactionType === 'PROMOTED' ? 'up' : transactionType === 'DEMOTED' ? 'down' : 'swap',
  };
}

// ============================================
// NEWS FEED MANAGEMENT
// ============================================

const MAX_STORIES = 50;

/**
 * Add stories to a news feed, maintaining the max limit
 */
export function addStoriesToFeed(
  currentFeed: NewsStory[],
  newStories: NewsStory[]
): NewsStory[] {
  // Combine with new stories at the front
  const combined = [...newStories, ...currentFeed];

  // Sort by date (most recent first)
  combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Limit to MAX_STORIES
  return combined.slice(0, MAX_STORIES);
}

/**
 * Filter stories by type
 */
export function filterStoriesByType(
  stories: NewsStory[],
  type: NewsStoryType
): NewsStory[] {
  return stories.filter(story => story.type === type);
}

/**
 * Get high priority (breaking news) stories
 */
export function getBreakingNews(stories: NewsStory[]): NewsStory[] {
  return stories.filter(story => story.priority === 'HIGH');
}

/**
 * Get ticker stories (low priority, for scrolling display)
 */
export function getTickerStories(stories: NewsStory[], limit: number = 10): NewsStory[] {
  return stories.filter(story => story.priority === 'LOW').slice(0, limit);
}
