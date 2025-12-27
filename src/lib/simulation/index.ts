// ============================================
// Simulation Engine - Main Export
// ============================================

// Math Engine (Advanced Statistical Models)
export {
  // Pythagorean Expectation
  pythagoreanExpectation,
  calculateExpectedRuns,
  simulateGameOutcome,

  // Log5 Method
  log5HitProbability,
  adjustProbabilitiesForPitcher,

  // Probability Calculations
  calculateBatterProbabilities,
  calculatePitcherProbabilities,

  // Plate Appearance Simulation
  simulatePlateAppearance,
  simulateFullGame,

  // Season Projections
  projectSeasonStats,
  validateRatingScale,

  // Random Number Generation
  randomNormal,
  randomNormalBounded,
  weightedRandomChoice,

  // Constants
  LEAGUE_BASELINES,

  // Types
  type TeamOffenseDefense,
  type PlateAppearanceOutcome,
  type BatterProbabilities,
  type GamePlayerStats,
  type PitcherGameStats,
  type GameSimulationResult,
  type BatterInfo,
  type PitcherInfo,
  type SeasonProjection,
  type RatingValidation,
} from './math-engine';

// Player Development
export {
  calculatePlayerGrowth,
  calculateRosterGrowth,
  checkPromotionReadiness,
  calculateEarlyPromotionEffects,
  calculateLatePromotionEffects,
  calculateIdealPromotionEffects,
  simulateInjury,
  agePlayer,
  type PlayerGrowthInput,
  type PromotionReadiness,
  type PromotionEffects,
  type InjuryResult,
} from './player-development';

// Season Simulation
export {
  // Team Strength (Pythagorean-based)
  calculateTeamOffenseDefense,
  calculateTeamStrength,
  calculateAITeamOffenseDefense,
  calculateAITeamStrength,

  // Win Probability (Pythagorean Expectation)
  calculateExpectedWinPctPythagorean,
  calculateExpectedWinPct,
  simulateSeasonRecord,

  // Standings & Playoffs
  simulateLeagueStandings,
  simulatePlayoffs,
  calculateAttendance,
  simulateSeason,
  checkPromotionEligibility,

  type SeasonSimulationInput,
} from './season';

// Financial Simulation
export {
  calculateTicketRevenue,
  calculateConcessionRevenue,
  calculateParkingRevenue,
  calculateMerchandiseRevenue,
  calculateSponsorshipRevenue,
  calculatePlayerSalaries,
  calculateCoachingSalaries,
  calculateStadiumMaintenance,
  calculateTravelCosts,
  calculateDebtService,
  simulateFinances,
  checkBankruptcyStatus,
  generateBudgetRecommendations,
  calculatePlayerSalary,
  calculateMinimumRosterCost,
  type FinancialSimulationInput,
  type BankruptcyStatus,
  type BudgetRecommendation,
} from './financial';

// City Growth
export {
  calculateSuccessScore,
  determineBuildingUpgrades,
  calculateCityMetrics,
  generateCityEvents,
  simulateCityGrowth,
  generateInitialCity,
  // District bonuses
  calculateCityBonuses,
  getDistrictSummary,
  type SeasonSuccessInput,
  type BuildingUpgrade,
  type CityMetricsUpdate,
  type CityGrowthInput,
} from './city-growth';

// Draft System
export {
  generateDraftClass,
  generateProspectAttributes,
  scoutProspect,
  calculateScoutingCost,
  aiDraftPick,
  simulateAIDraftPicks,
  type DraftClassConfig,
  type ScoutingResult,
} from './draft';

// Game Progression
export {
  checkPromotionEligibility as checkPromotionEligibilityAdvanced,
  checkGameStatus,
  calculatePromotionBonuses,
  getDebtWarning,
  getTierDisplayName,
  getTierLevel,
  isTopTier,
  getProgressToNextTier,
  type PromotionCheckInput,
  type PromotionEligibility,
  type GameStatusCheck,
  type GameStatus,
  type PromotionResult,
  type DebtWarning,
} from './progression';

// Dynamic Narrative Engine (Headlines & News)
export {
  // Game headlines
  generateGameHeadlines,
  generatePlayerPerformanceHeadlines,

  // City & Milestone headlines
  generateCityHeadlines,
  generateMilestoneHeadlines,

  // Transaction headlines
  generateTransactionHeadline,

  // News feed management
  addStoriesToFeed,
  filterStoriesByType,
  getBreakingNews,
  getTickerStories,

  type HeadlineContext,
} from './headline-generator';

// Contract & Free Agency System
export {
  // Salary calculation
  calculateSalary,
  calculateContractYears,

  // Contract generation
  generateContractOffer,
  generateRookieContract,

  // Free agency
  calculateResignProbability,
  playerAcceptsOffer,
  processContractExpiration,
  decrementContracts,

  // Payroll management
  calculatePayroll,
  canAffordSalary,

  // Migration helpers
  generateMigrationContract,

  // Constants
  CONTRACT_LENGTH_TIERS,
  MORALE_THRESHOLDS,

  // Types
  type ContractOffer,
  type PayrollSummary,
  type FreeAgentResult,
} from './contracts';

// Box Score Simulation
export {
  // Single game simulation
  simulateGame,
  simulateGameBatch,
  getRandomOpponent,
} from './box-score';

// Player Training System
export {
  // Training processing
  processPlayerTraining,
  processBatchTraining,
  calculateProgressionRate,
  getRecommendedTrainingFocus,
  calculateTrainingSummary,

  // Configuration
  TRAINING_CONFIG,

  // Types
  type TrainingResult,
  type BatchTrainingResult,
  type TrainingSummary,
} from './training';

// Playoff System
export {
  // Bracket generation
  generatePlayoffStandings,
  generatePlayoffBracket,
  generateFinalsSeries,

  // Series simulation
  simulatePlayoffGame,
  simulatePlayoffSeries,
  simulateNextSeriesGame,

  // Helpers
  didPlayerMakePlayoffs,
  getPlayerSeed,
  arePlayoffsComplete,
  didPlayerWinChampionship,

  // Types
  type PlayoffStanding,
  type PlayoffBracketInput,
  type PlayoffGameResult,
  type SeriesResult,
} from './playoffs';

// Offseason System
export {
  // Historical archiving
  archiveSeasonStats,
  createEmptySeasonStats,

  // Winter development
  calculateWinterDevelopment,
  applyRatingChange,

  // Contracts
  processContractYear,

  // Draft order
  generateDraftOrder,
  getPlayerDraftPosition,

  // Playoff results
  determinePlayoffResult,

  // MVP
  calculateMVPScore,
  determineSeasonMVP,

  // Types
  type SeasonStatsSummary,
  type CareerStats,
  type TeamHistoryEntry,
  type DraftOrderEntry,
  type WinterDevelopmentResult,
  type ContractExpirationResult,
  type OffseasonSummary,
} from './offseason';
