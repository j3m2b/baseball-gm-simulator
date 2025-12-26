// ============================================
// Formatting Utility Functions
// ============================================

/**
 * Format a number as currency
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format a large number with abbreviation (K, M, B)
 */
export function formatCompactNumber(num: number): string {
  if (num >= 1_000_000_000) {
    return (num / 1_000_000_000).toFixed(1) + 'B';
  }
  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(1) + 'M';
  }
  if (num >= 1_000) {
    return (num / 1_000).toFixed(1) + 'K';
  }
  return num.toString();
}

/**
 * Format a decimal as a percentage
 */
export function formatPercentage(decimal: number, decimals: number = 1): string {
  return `${(decimal * 100).toFixed(decimals)}%`;
}

/**
 * Format win-loss record
 */
export function formatRecord(wins: number, losses: number): string {
  return `${wins}-${losses}`;
}

/**
 * Format win percentage (baseball style: .XXX)
 */
export function formatWinPct(pct: number): string {
  return pct.toFixed(3).replace(/^0/, '');
}

/**
 * Format a player's full name
 */
export function formatPlayerName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`;
}

/**
 * Format a rating with + or - prefix for changes
 */
export function formatRatingChange(change: number): string {
  if (change > 0) return `+${change}`;
  if (change < 0) return `${change}`;
  return '0';
}

/**
 * Get ordinal suffix for a number (1st, 2nd, 3rd, etc.)
 */
export function getOrdinalSuffix(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/**
 * Format a tier name for display
 */
export function formatTierName(tier: string): string {
  const tierNames: Record<string, string> = {
    LOW_A: 'Low-A',
    HIGH_A: 'High-A',
    DOUBLE_A: 'Double-A',
    TRIPLE_A: 'Triple-A',
    MLB: 'MLB',
  };
  return tierNames[tier] || tier;
}

/**
 * Format position name
 */
export function formatPosition(position: string): string {
  const positions: Record<string, string> = {
    SP: 'Starting Pitcher',
    RP: 'Relief Pitcher',
    C: 'Catcher',
    '1B': 'First Base',
    '2B': 'Second Base',
    '3B': 'Third Base',
    SS: 'Shortstop',
    LF: 'Left Field',
    CF: 'Center Field',
    RF: 'Right Field',
    DH: 'Designated Hitter',
  };
  return positions[position] || position;
}

/**
 * Get rating grade (based on 20-80 scale)
 */
export function getRatingGrade(rating: number): string {
  if (rating >= 80) return '80 (Elite)';
  if (rating >= 70) return '70 (Plus-Plus)';
  if (rating >= 60) return '60 (Plus)';
  if (rating >= 55) return '55 (Above Avg)';
  if (rating >= 50) return '50 (Average)';
  if (rating >= 45) return '45 (Below Avg)';
  if (rating >= 40) return '40 (Fringe)';
  if (rating >= 30) return '30 (Poor)';
  return '20 (Well Below)';
}
