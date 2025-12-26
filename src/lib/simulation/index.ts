// ============================================
// Simulation Engine - Main Export
// ============================================

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
  calculateTeamStrength,
  calculateAITeamStrength,
  calculateExpectedWinPct,
  simulateSeasonRecord,
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
