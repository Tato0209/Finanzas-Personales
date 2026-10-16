<?php

namespace App\Services\Salary;

use App\Enums\AccountType;
use App\Enums\CategoryType;
use App\Enums\TransactionSource;
use App\Models\Account;
use App\Models\Category;
use App\Models\Transaction;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class SalaryStatementService
{
    /**
     * Return salary statement data for the given account and month.
     *
     * @return array<string, mixed>
     */
    public function presentFor(Account $account, User $user, ?string $requestedMonth = null): array
    {
        if ($account->type !== AccountType::Salary) {
            return [];
        }

        $now = Carbon::now();
        $selectedMonth = $requestedMonth && preg_match('/^\d{4}-\d{2}$/', $requestedMonth)
            ? $requestedMonth
            : $now->format('Y-m');

        $startOfMonth = Carbon::parse($selectedMonth.'-01')->startOfMonth();
        $endOfMonth = $startOfMonth->copy()->endOfMonth();

        // 1. Fetch all transactions for this account in this month
        $transactions = $account->transactions()
            ->with(['category', 'labels'])
            ->whereBetween('transaction_date', [$startOfMonth->toDateString(), $endOfMonth->toDateString()])
            ->orderBy('transaction_date', 'desc')
            ->orderBy('id', 'desc')
            ->get();

        $incomeTransactions = $transactions->filter(fn (Transaction $t) => $t->amount > 0);
        $expenseTransactions = $transactions->filter(fn (Transaction $t) => $t->amount < 0);

        $salaryAmount = (int) $incomeTransactions->sum('amount');
        $hasSalarySet = $incomeTransactions->isNotEmpty();
        $totalSpent = (int) abs($expenseTransactions->sum('amount'));
        $remainingBalance = $salaryAmount - $totalSpent;

        $savingsRate = $salaryAmount > 0 ? max(0, (int) round(($remainingBalance / $salaryAmount) * 100)) : 0;
        $spentPercentage = $salaryAmount > 0 ? min(100, (int) round(($totalSpent / $salaryAmount) * 100)) : 0;

        // 2. Category breakdown for expenses
        $categoriesBreakdown = $expenseTransactions
            ->groupBy('category_id')
            ->map(function (Collection $group) use ($totalSpent) {
                /** @var Transaction $first */
                $first = $group->first();
                $category = $first->category;
                $catTotal = (int) abs($group->sum('amount'));
                $percentage = $totalSpent > 0 ? round(($catTotal / $totalSpent) * 100, 1) : 0;

                return [
                    'category_id' => $category?->id,
                    'name' => $category?->name ?? 'Sin categoría',
                    'icon' => $category?->icon ?? 'help-circle',
                    'color' => $category?->color ?? '#94a3b8',
                    'total' => $catTotal,
                    'percentage' => $percentage,
                    'count' => $group->count(),
                ];
            })
            ->sortByDesc('total')
            ->values()
            ->all();

        // 3. Available months with transactions for this account
        $availableMonths = $account->transactions()
            ->selectRaw("DISTINCT DATE_FORMAT(transaction_date, '%Y-%m') as ym")
            ->pluck('ym')
            ->prepend($now->format('Y-m'))
            ->filter()
            ->unique()
            ->sortDesc()
            ->values()
            ->all();

        return [
            'salary_statement' => [
                'month' => $selectedMonth,
                'month_name' => $startOfMonth->translatedFormat('F Y'),
                'is_current_month' => $selectedMonth === $now->format('Y-m'),
                'salary_amount' => $salaryAmount,
                'has_salary_set' => $hasSalarySet,
                'total_spent' => $totalSpent,
                'remaining_balance' => $remainingBalance,
                'savings_rate' => $savingsRate,
                'spent_percentage' => $spentPercentage,
                'categories_breakdown' => $categoriesBreakdown,
                'available_months' => $availableMonths,
                'transaction_count' => $transactions->count(),
            ],
        ];
    }

    /**
     * Record or update the monthly salary for the given account.
     */
    public function setMonthlySalary(Account $account, User $user, string $month, int $amount): Transaction
    {
        $startOfMonth = Carbon::parse($month.'-01')->startOfMonth();

        // Find existing salary income transaction in that month
        $existing = $account->transactions()
            ->whereBetween('transaction_date', [$startOfMonth->toDateString(), $startOfMonth->copy()->endOfMonth()->toDateString()])
            ->where('amount', '>', 0)
            ->first();

        if ($existing) {
            $existing->update([
                'amount' => $amount,
                'transaction_date' => $startOfMonth->toDateString(),
            ]);

            return $existing;
        }

        // Find or fallback category
        $category = Category::query()
            ->where('user_id', $user->id)
            ->where('type', CategoryType::Income)
            ->where(function ($q) {
                $q->where('name', 'like', '%salario%')
                    ->orWhere('name', 'like', '%salary%')
                    ->orWhere('name', 'like', '%nomina%')
                    ->orWhere('name', 'like', '%nómina%');
            })
            ->first() ?? Category::query()
            ->where('user_id', $user->id)
            ->where('type', CategoryType::Income)
            ->first();

        return Transaction::create([
            'user_id' => $user->id,
            'space_id' => $account->space_id,
            'account_id' => $account->id,
            'amount' => $amount,
            'currency_code' => $account->currency_code,
            'transaction_date' => $startOfMonth->toDateString(),
            'description' => 'Salario '.$startOfMonth->translatedFormat('F Y'),
            'category_id' => $category?->id,
            'source' => TransactionSource::ManuallyCreated,
        ]);
    }
}
