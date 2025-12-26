'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils/format';

interface FinancesTabProps {
  franchise: {
    budget: number;
    reserves: number;
    stadium_capacity: number;
    stadium_quality: number;
    ticket_price: number;
    hitting_coach_salary: number;
    pitching_coach_salary: number;
    development_coord_salary: number;
  } | null;
  roster: Array<{
    salary: number;
  }>;
  gameId: string;
  currentYear: number;
}

interface FinanceRecord {
  year: number;
  ticket_revenue: number;
  concession_revenue: number;
  parking_revenue: number;
  merchandise_revenue: number;
  sponsorship_revenue: number;
  total_revenue: number;
  player_salaries: number;
  coaching_salaries: number;
  stadium_maintenance: number;
  travel_costs: number;
  marketing_costs: number;
  total_expenses: number;
  net_income: number;
  ending_reserves: number;
}

export default function FinancesTab({ franchise, roster, gameId, currentYear }: FinancesTabProps) {
  const [finances, setFinances] = useState<FinanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // For now, we'll show current projections since we don't have historical finances yet
  // In a full implementation, you'd fetch from the finances table

  if (!franchise) {
    return (
      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="py-12 text-center text-gray-400">
          Financial data not available
        </CardContent>
      </Card>
    );
  }

  const totalPlayerSalaries = roster.reduce((sum, p) => sum + (p.salary || 0), 0);
  const totalCoachingSalaries =
    franchise.hitting_coach_salary +
    franchise.pitching_coach_salary +
    franchise.development_coord_salary;

  // Projected revenue (simplified estimates)
  const projectedAttendance = Math.round(franchise.stadium_capacity * 0.65 * 66); // 65% capacity, 66 home games
  const projectedTicketRevenue = projectedAttendance * franchise.ticket_price;
  const projectedConcessionRevenue = Math.round(projectedAttendance * 12);
  const projectedParkingRevenue = Math.round(projectedAttendance * 0.25 * 15);
  const projectedMerchandiseRevenue = Math.round(projectedAttendance * 6);
  const projectedSponsorshipRevenue = 150000; // Base for Low-A
  const projectedTotalRevenue =
    projectedTicketRevenue +
    projectedConcessionRevenue +
    projectedParkingRevenue +
    projectedMerchandiseRevenue +
    projectedSponsorshipRevenue;

  // Expenses
  const stadiumMaintenance = Math.round(franchise.stadium_capacity * 8);
  const travelCosts = 50000; // Base for Low-A
  const marketingCosts = 25000;
  const projectedTotalExpenses =
    totalPlayerSalaries +
    totalCoachingSalaries +
    stadiumMaintenance +
    travelCosts +
    marketingCosts;

  const projectedNetIncome = projectedTotalRevenue - projectedTotalExpenses;

  function getIncomeColor(value: number): string {
    return value >= 0 ? 'text-green-500' : 'text-red-500';
  }

  return (
    <div className="space-y-6">
      {/* Financial Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="pt-6">
            <div className={`text-3xl font-bold ${getIncomeColor(franchise.reserves)}`}>
              {formatCurrency(franchise.reserves)}
            </div>
            <p className="text-sm text-gray-400">Current Reserves</p>
            <div className="mt-2">
              <Badge className={franchise.reserves >= 0 ? 'bg-green-600' : 'bg-red-600'}>
                {franchise.reserves >= 0 ? 'Healthy' : 'Warning'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-white">
              {formatCurrency(franchise.budget)}
            </div>
            <p className="text-sm text-gray-400">Annual Budget</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="pt-6">
            <div className={`text-3xl font-bold ${getIncomeColor(projectedNetIncome)}`}>
              {formatCurrency(projectedNetIncome)}
            </div>
            <p className="text-sm text-gray-400">Projected Net Income</p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Breakdown */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-lg flex justify-between items-center">
            <span>Projected Revenue</span>
            <span className="text-green-500">{formatCurrency(projectedTotalRevenue)}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <div className="text-white">Ticket Sales</div>
                <div className="text-xs text-gray-500">
                  {projectedAttendance.toLocaleString()} fans × ${franchise.ticket_price}
                </div>
              </div>
              <span className="text-green-500">{formatCurrency(projectedTicketRevenue)}</span>
            </div>

            <div className="flex justify-between items-center">
              <div>
                <div className="text-white">Concessions</div>
                <div className="text-xs text-gray-500">~$12 per fan</div>
              </div>
              <span className="text-green-500">{formatCurrency(projectedConcessionRevenue)}</span>
            </div>

            <div className="flex justify-between items-center">
              <div>
                <div className="text-white">Parking</div>
                <div className="text-xs text-gray-500">25% of fans drive, $15 avg</div>
              </div>
              <span className="text-green-500">{formatCurrency(projectedParkingRevenue)}</span>
            </div>

            <div className="flex justify-between items-center">
              <div>
                <div className="text-white">Merchandise</div>
                <div className="text-xs text-gray-500">~$6 per fan</div>
              </div>
              <span className="text-green-500">{formatCurrency(projectedMerchandiseRevenue)}</span>
            </div>

            <div className="flex justify-between items-center">
              <div>
                <div className="text-white">Sponsorships</div>
                <div className="text-xs text-gray-500">Local business partnerships</div>
              </div>
              <span className="text-green-500">{formatCurrency(projectedSponsorshipRevenue)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Expense Breakdown */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-lg flex justify-between items-center">
            <span>Projected Expenses</span>
            <span className="text-red-500">{formatCurrency(projectedTotalExpenses)}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <div className="text-white">Player Salaries</div>
                <div className="text-xs text-gray-500">{roster.length} players</div>
              </div>
              <span className="text-red-500">{formatCurrency(totalPlayerSalaries)}</span>
            </div>

            <div className="flex justify-between items-center">
              <div>
                <div className="text-white">Coaching Staff</div>
                <div className="text-xs text-gray-500">3 coaches</div>
              </div>
              <span className="text-red-500">{formatCurrency(totalCoachingSalaries)}</span>
            </div>

            <div className="flex justify-between items-center">
              <div>
                <div className="text-white">Stadium Maintenance</div>
                <div className="text-xs text-gray-500">~$8 per seat capacity</div>
              </div>
              <span className="text-red-500">{formatCurrency(stadiumMaintenance)}</span>
            </div>

            <div className="flex justify-between items-center">
              <div>
                <div className="text-white">Travel Costs</div>
                <div className="text-xs text-gray-500">Away game transportation</div>
              </div>
              <span className="text-red-500">{formatCurrency(travelCosts)}</span>
            </div>

            <div className="flex justify-between items-center">
              <div>
                <div className="text-white">Marketing</div>
                <div className="text-xs text-gray-500">Advertising & promotion</div>
              </div>
              <span className="text-red-500">{formatCurrency(marketingCosts)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stadium & Pricing */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-lg">Stadium</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-gray-400">Capacity</span>
              <span className="text-white">{franchise.stadium_capacity.toLocaleString()} seats</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Quality Rating</span>
              <span className="text-white">{franchise.stadium_quality}/100</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Ticket Price</span>
              <span className="text-white">${franchise.ticket_price}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Projected Fill Rate</span>
              <span className="text-white">65%</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-lg">Coaching Staff</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-gray-400">Hitting Coach</span>
              <span className="text-white">{formatCurrency(franchise.hitting_coach_salary)}/yr</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Pitching Coach</span>
              <span className="text-white">{formatCurrency(franchise.pitching_coach_salary)}/yr</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Development Coordinator</span>
              <span className="text-white">{formatCurrency(franchise.development_coord_salary)}/yr</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Financial Tips */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-lg">Financial Tips</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-gray-400 space-y-2">
          <ul className="list-disc list-inside space-y-1">
            <li>Higher team pride increases attendance and merchandise sales</li>
            <li>Winning seasons attract better sponsorship deals</li>
            <li>Stadium upgrades improve quality and revenue potential</li>
            <li>Keep reserves positive to avoid bankruptcy</li>
            <li>Better coaches cost more but accelerate player development</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
