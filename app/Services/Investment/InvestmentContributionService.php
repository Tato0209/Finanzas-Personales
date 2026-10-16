<?php

namespace App\Services\Investment;

use App\Enums\AccountType;
use App\Models\Account;
use App\Models\AccountBalance;
use App\Models\InvestmentContribution;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class InvestmentContributionService
{
    /**
     * Present investment contributions data for the account view.
     *
     * @return array<string, mixed>
     */
    public function presentFor(Account $account, User $user, ?string $selectedMonth = null): array
    {
        if (! in_array($account->type, [AccountType::Investment, AccountType::Retirement], true)) {
            return [];
        }

        $now = Carbon::now();
        $currentMonth = $now->format('Y-m');

        // Fetch all contributions for this account
        $contributions = $account->investmentContributions()->get();

        $totalContributed = (int) $contributions->sum('amount');
        $currentMonthContributed = (int) $contributions->where('month', $currentMonth)->sum('amount');
        $currentMonthHasContribution = $currentMonthContributed > 0;

        // Group contributions by month
        $monthlyBreakdown = $contributions
            ->groupBy('month')
            ->map(function (Collection $group, string $month) {
                $monthCarbon = Carbon::parse($month.'-01');
                $total = (int) $group->sum('amount');

                return [
                    'month' => $month,
                    'month_name' => $monthCarbon->translatedFormat('F Y'),
                    'total' => $total,
                    'count' => $group->count(),
                    'items' => $group->map(fn (InvestmentContribution $c) => [
                        'id' => $c->id,
                        'contribution_date' => $c->contribution_date->toDateString(),
                        'formatted_date' => $c->contribution_date->translatedFormat('d M Y'),
                        'amount' => $c->amount,
                        'notes' => $c->notes,
                    ])->values()->all(),
                ];
            })
            ->sortByDesc('month')
            ->values()
            ->all();

        // Calculate average monthly contribution
        $distinctMonthsCount = count($monthlyBreakdown);
        $averageMonthly = $distinctMonthsCount > 0
            ? (int) round($totalContributed / $distinctMonthsCount)
            : 0;

        // Latest account balance and invested amount
        $latestBalanceRecord = $account->balances()->latest('balance_date')->first();
        $latestMarketValue = $latestBalanceRecord->balance ?? 0;
        $investedAmount = $latestBalanceRecord->invested_amount ?? $totalContributed;

        $netGain = $latestMarketValue - $investedAmount;
        $gainPercentage = $investedAmount > 0
            ? round(($netGain / abs($investedAmount)) * 100, 1)
            : 0.0;

        return [
            'investment_contributions_data' => [
                'has_contributions' => $contributions->isNotEmpty(),
                'total_contributed' => $totalContributed,
                'current_month' => $currentMonth,
                'current_month_name' => $now->translatedFormat('F Y'),
                'current_month_contributed' => $currentMonthContributed,
                'current_month_has_contribution' => $currentMonthHasContribution,
                'average_monthly' => $averageMonthly,
                'contributions_count' => $contributions->count(),
                'latest_market_value' => $latestMarketValue,
                'invested_amount' => $investedAmount,
                'net_gain' => $netGain,
                'gain_percentage' => $gainPercentage,
                'monthly_breakdown' => $monthlyBreakdown,
                'contributions' => $contributions->map(fn (InvestmentContribution $c) => [
                    'id' => $c->id,
                    'contribution_date' => $c->contribution_date->toDateString(),
                    'formatted_date' => $c->contribution_date->translatedFormat('d M Y'),
                    'month' => $c->month,
                    'amount' => $c->amount,
                    'notes' => $c->notes,
                ])->values()->all(),
            ],
        ];
    }

    /**
     * Record a new monthly contribution and optionally update the latest balance.
     */
    public function recordContribution(Account $account, User $user, array $data): InvestmentContribution
    {
        $contributionDate = Carbon::parse($data['contribution_date']);
        $month = $contributionDate->format('Y-m');
        $amount = (int) $data['amount'];
        $notes = ! empty($data['notes']) ? (string) $data['notes'] : null;
        $addToBalance = ! empty($data['add_to_balance']);
        $addToInvested = ! empty($data['add_to_invested']);

        $contribution = InvestmentContribution::create([
            'account_id' => $account->id,
            'user_id' => $user->id,
            'contribution_date' => $contributionDate->toDateString(),
            'month' => $month,
            'amount' => $amount,
            'currency_code' => $account->currency_code,
            'notes' => $notes,
        ]);

        // Sync with account balance records if requested
        $latest = $account->balances()->latest('balance_date')->first();

        if ($latest) {
            $updates = [];
            if ($addToBalance) {
                $updates['balance'] = $latest->balance + $amount;
            }
            if ($addToInvested) {
                $currentInvested = $latest->invested_amount ?? $latest->balance;
                $updates['invested_amount'] = $currentInvested + $amount;
            }

            if (! empty($updates)) {
                $latest->update($updates);
            }
        } else {
            // First balance record
            AccountBalance::create([
                'account_id' => $account->id,
                'balance_date' => $contributionDate->toDateString(),
                'balance' => $amount,
                'invested_amount' => $amount,
            ]);
        }

        return $contribution;
    }

    /**
     * Update an existing contribution.
     */
    public function updateContribution(Account $account, InvestmentContribution $contribution, array $data): InvestmentContribution
    {
        $previousAmount = $contribution->amount;
        $contributionDate = Carbon::parse($data['contribution_date']);
        $month = $contributionDate->format('Y-m');
        $newAmount = (int) $data['amount'];
        $diff = $newAmount - $previousAmount;

        $contribution->update([
            'contribution_date' => $contributionDate->toDateString(),
            'month' => $month,
            'amount' => $newAmount,
            'notes' => ! empty($data['notes']) ? (string) $data['notes'] : null,
        ]);

        if ($diff !== 0 && ! empty($data['sync_balance'])) {
            $latest = $account->balances()->latest('balance_date')->first();
            if ($latest) {
                $latest->update([
                    'balance' => max(0, $latest->balance + $diff),
                    'invested_amount' => max(0, ($latest->invested_amount ?? $latest->balance) + $diff),
                ]);
            }
        }

        return $contribution;
    }

    /**
     * Delete an existing contribution.
     */
    public function deleteContribution(Account $account, InvestmentContribution $contribution, bool $adjustBalance = false): void
    {
        $amount = $contribution->amount;
        $contribution->delete();

        if ($adjustBalance) {
            $latest = $account->balances()->latest('balance_date')->first();
            if ($latest) {
                $latest->update([
                    'balance' => max(0, $latest->balance - $amount),
                    'invested_amount' => max(0, ($latest->invested_amount ?? $latest->balance) - $amount),
                ]);
            }
        }
    }
}
