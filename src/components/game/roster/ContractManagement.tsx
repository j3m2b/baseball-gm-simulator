'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils/format';
import {
  getPayrollSummary,
  getExpiringContracts,
  extendPlayerContract,
  releasePlayer,
  generatePlayerContractOffer,
} from '@/lib/actions/game';

interface ContractManagementProps {
  gameId: string;
  reserves: number;
}

interface PayrollData {
  totalPayroll: number;
  salaryCap: number;
  capSpace: number;
  overCap: boolean;
  luxuryTaxThreshold: number;
  inLuxuryTax: boolean;
  playerSalaries: { playerId: string; name: string; salary: number }[];
}

interface ExpiringContract {
  id: string;
  name: string;
  position: string;
  rating: number;
  age: number;
  morale: number;
  salary: number;
  contractYears: number;
}

export default function ContractManagement({ gameId, reserves }: ContractManagementProps) {
  const router = useRouter();
  const [payroll, setPayroll] = useState<PayrollData | null>(null);
  const [expiringContracts, setExpiringContracts] = useState<ExpiringContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadData();
  }, [gameId]);

  async function loadData() {
    setLoading(true);
    try {
      const [payrollData, contracts] = await Promise.all([
        getPayrollSummary(gameId),
        getExpiringContracts(gameId),
      ]);
      setPayroll(payrollData);
      setExpiringContracts(contracts);
    } catch (error) {
      console.error('Error loading contract data:', error);
    }
    setLoading(false);
  }

  async function handleExtendContract(playerId: string) {
    setActionLoading(playerId);
    setMessage(null);

    try {
      const result = await extendPlayerContract(gameId, playerId);

      if (result.success) {
        if (result.accepted) {
          setMessage({
            type: 'success',
            text: `Contract extended! ${result.newYears} years at ${formatCurrency(result.newSalary || 0)}/year`,
          });
        } else {
          setMessage({
            type: 'error',
            text: result.error || 'Player declined the offer',
          });
        }
        await loadData();
        router.refresh();
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to extend contract' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An error occurred' });
    }

    setActionLoading(null);
  }

  async function handleRelease(playerId: string, playerName: string) {
    if (!confirm(`Are you sure you want to release ${playerName}?`)) {
      return;
    }

    setActionLoading(playerId);
    setMessage(null);

    try {
      const result = await releasePlayer(gameId, playerId);

      if (result.success) {
        setMessage({ type: 'success', text: `${playerName} has been released` });
        await loadData();
        router.refresh();
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to release player' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An error occurred' });
    }

    setActionLoading(null);
  }

  if (loading) {
    return (
      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="py-8 text-center text-gray-400">
          Loading contract data...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Payroll Summary */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <span>$</span>
            <span>Payroll Summary</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {payroll ? (
            <div className="space-y-4">
              {/* Cap Status Bar */}
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-400">Salary Cap Usage</span>
                  <span className={payroll.overCap ? 'text-red-400' : 'text-green-400'}>
                    {formatCurrency(payroll.totalPayroll)} / {formatCurrency(payroll.salaryCap)}
                  </span>
                </div>
                <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      payroll.inLuxuryTax
                        ? 'bg-red-500'
                        : payroll.overCap
                        ? 'bg-yellow-500'
                        : 'bg-green-500'
                    }`}
                    style={{
                      width: `${Math.min(100, (payroll.totalPayroll / payroll.salaryCap) * 100)}%`,
                    }}
                  />
                </div>
                {/* Threshold Markers */}
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>$0</span>
                  <span className="text-yellow-400">Cap: {formatCurrency(payroll.salaryCap)}</span>
                  <span className="text-red-400">Luxury: {formatCurrency(payroll.luxuryTaxThreshold)}</span>
                </div>
              </div>

              {/* Key Stats */}
              <div className="grid grid-cols-3 gap-4 pt-3 border-t border-gray-800">
                <div className="text-center">
                  <div className={`text-xl font-bold ${payroll.capSpace >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {formatCurrency(payroll.capSpace)}
                  </div>
                  <div className="text-xs text-gray-400">Cap Space</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-white">
                    {payroll.playerSalaries.length}
                  </div>
                  <div className="text-xs text-gray-400">Active Players</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-amber-400">
                    {formatCurrency(reserves)}
                  </div>
                  <div className="text-xs text-gray-400">Cash Reserves</div>
                </div>
              </div>

              {/* Status Badges */}
              <div className="flex gap-2 justify-center pt-2">
                {payroll.overCap && (
                  <Badge variant="destructive" className="bg-yellow-600">
                    Over Cap
                  </Badge>
                )}
                {payroll.inLuxuryTax && (
                  <Badge variant="destructive" className="bg-red-600">
                    Luxury Tax
                  </Badge>
                )}
                {!payroll.overCap && (
                  <Badge className="bg-green-600">Under Cap</Badge>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-400">Unable to load payroll data</div>
          )}
        </CardContent>
      </Card>

      {/* Expiring Contracts */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg flex items-center gap-2">
              <span>Contract Decisions</span>
              {expiringContracts.length > 0 && (
                <Badge variant="outline" className="bg-amber-900/30 border-amber-600 text-amber-400">
                  {expiringContracts.length} expiring
                </Badge>
              )}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {/* Message */}
          {message && (
            <div
              className={`mb-4 p-3 rounded-lg text-sm ${
                message.type === 'success'
                  ? 'bg-green-900/30 border border-green-700 text-green-400'
                  : 'bg-red-900/30 border border-red-700 text-red-400'
              }`}
            >
              {message.text}
            </div>
          )}

          {expiringContracts.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <p>No contracts expiring this year</p>
              <p className="text-sm mt-2">Players become free agents when their contract years reach 0</p>
            </div>
          ) : (
            <div className="space-y-3">
              {expiringContracts.map((player) => (
                <div
                  key={player.id}
                  className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg border border-gray-700"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center text-lg">
                      {player.position === 'SP' || player.position === 'RP' ? '⚾' : '🏏'}
                    </div>
                    <div>
                      <div className="font-medium text-white">{player.name}</div>
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <span>{player.position}</span>
                        <span>|</span>
                        <span>Age {player.age}</span>
                        <span>|</span>
                        <span className={player.rating >= 60 ? 'text-green-400' : player.rating >= 45 ? 'text-yellow-400' : 'text-gray-400'}>
                          {player.rating} OVR
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Morale Indicator */}
                    <div className="text-center">
                      <div className={`text-sm font-medium ${
                        player.morale >= 70 ? 'text-green-400' :
                        player.morale >= 40 ? 'text-yellow-400' : 'text-red-400'
                      }`}>
                        {player.morale >= 70 ? 'Happy' : player.morale >= 40 ? 'Neutral' : 'Unhappy'}
                      </div>
                      <div className="text-xs text-gray-500">Morale</div>
                    </div>

                    {/* Current Salary */}
                    <div className="text-center">
                      <div className="text-sm font-medium text-white">
                        {formatCurrency(player.salary)}
                      </div>
                      <div className="text-xs text-gray-500">Current</div>
                    </div>

                    {/* Contract Status */}
                    <Badge
                      variant="outline"
                      className={
                        player.contractYears === 0
                          ? 'bg-red-900/30 border-red-600 text-red-400'
                          : 'bg-amber-900/30 border-amber-600 text-amber-400'
                      }
                    >
                      {player.contractYears === 0 ? 'Free Agent' : `${player.contractYears} yr left`}
                    </Badge>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleExtendContract(player.id)}
                        disabled={actionLoading === player.id}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {actionLoading === player.id ? 'Processing...' : 'Extend'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRelease(player.id, player.name)}
                        disabled={actionLoading === player.id}
                        className="border-red-600 text-red-400 hover:bg-red-900/30"
                      >
                        Release
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Help Text */}
          <div className="mt-4 pt-4 border-t border-gray-800 text-xs text-gray-500">
            <p>Players with high morale and on winning teams are more likely to re-sign.</p>
            <p className="mt-1">Contracts expire at the end of each season. Plan ahead!</p>
          </div>
        </CardContent>
      </Card>

      {/* Top Salaries */}
      {payroll && payroll.playerSalaries.length > 0 && (
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-lg">Top Salaries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {payroll.playerSalaries.slice(0, 5).map((player, index) => (
                <div
                  key={player.playerId}
                  className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-gray-500 w-5">{index + 1}.</span>
                    <span className="text-white">{player.name}</span>
                  </div>
                  <span className="text-green-400 font-mono">
                    {formatCurrency(player.salary)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
