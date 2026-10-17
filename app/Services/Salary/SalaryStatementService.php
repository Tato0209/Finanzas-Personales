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
        $isSalary = $account->type === AccountType::Salary
            || in_array($account->type->value, ['salary', 'salario'], true);

        if (! $isSalary) {
            return [];
        }

        $now = Carbon::now();
        $isAllTime = $requestedMonth === 'all';
        $selectedMonth = $requestedMonth && preg_match('/^\d{4}-\d{2}$/', $requestedMonth)
            ? $requestedMonth
            : $now->format('Y-m');

        $startOfMonth = Carbon::parse(($isAllTime ? $now->format('Y-m') : $selectedMonth).'-01')->startOfMonth();
        $endOfMonth = $startOfMonth->copy()->endOfMonth();

        // 1. Fetch all transactions for this account in this month
        $query = $account->transactions()
            ->with(['category', 'labels'])
            ->orderBy('transaction_date', 'desc')
            ->orderBy('id', 'desc');

        if (! $isAllTime) {
            $query->whereBetween('transaction_date', [$startOfMonth->toDateString(), $endOfMonth->toDateString()]);
        }

        /** @var Collection<int, Transaction> $transactions */
        $transactions = $query->get();

        $incomeTransactions = $transactions->filter(fn (Transaction $t) => $t->amount > 0);
        $expenseTransactions = $transactions->filter(fn (Transaction $t) => $t->amount < 0);

        $salaryAmount = (int) $incomeTransactions->sum('amount');
        $hasSalarySet = $incomeTransactions->isNotEmpty();
        $totalSpent = (int) abs($expenseTransactions->sum('amount'));
        $remainingBalance = $salaryAmount - $totalSpent;

        $savingsRate = $salaryAmount > 0 ? max(0, (int) round(($remainingBalance / $salaryAmount) * 100)) : 0;
        $spentPercentage = $salaryAmount > 0 ? min(100, (int) round(($totalSpent / $salaryAmount) * 100)) : 0;

        // 2. Category breakdown for expenses
        $categoriesBreakdown = $this->buildCategoryBreakdown($expenseTransactions, $totalSpent);

        // 3. Category breakdown for incomes
        $incomeCategoriesBreakdown = $this->buildCategoryBreakdown($incomeTransactions, $salaryAmount);

        // 4. All-time calculations for quick switching
        /** @var Collection<int, Transaction> $allTransactions */
        $allTransactions = $account->transactions()->with(['category'])->get();
        $allExpenses = $allTransactions->filter(fn (Transaction $t) => $t->amount < 0);
        $allIncomes = $allTransactions->filter(fn (Transaction $t) => $t->amount > 0);
        $allTimeTotalSpent = (int) abs($allExpenses->sum('amount'));
        $allTimeTotalIncome = (int) $allIncomes->sum('amount');
        $allTimeCategoriesBreakdown = $this->buildCategoryBreakdown($allExpenses, $allTimeTotalSpent);

        // 5. Month stats
        $daysInMonth = (int) $startOfMonth->daysInMonth;
        $currentDay = $now->isSameMonth($startOfMonth) ? min((int) $now->day, $daysInMonth) : ($now->isAfter($endOfMonth) ? $daysInMonth : 1);
        $remainingDays = $now->isSameMonth($startOfMonth) ? max(1, $daysInMonth - (int) $now->day) : 1;
        $averageDailySpend = $currentDay > 0 ? (int) round($totalSpent / $currentDay) : 0;
        $dailyBudgetRemaining = $remainingBalance > 0 ? (int) round($remainingBalance / $remainingDays) : 0;

        // 6. Available months with transactions for this account
        /** @var list<string> $availableMonths */
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
                'month' => $isAllTime ? 'all' : $selectedMonth,
                'month_name' => $isAllTime ? 'Todo el historial' : $startOfMonth->translatedFormat('F Y'),
                'is_current_month' => ! $isAllTime && $selectedMonth === $now->format('Y-m'),
                'is_all_time' => $isAllTime,
                'salary_amount' => $salaryAmount,
                'has_salary_set' => $hasSalarySet,
                'total_spent' => $totalSpent,
                'remaining_balance' => $remainingBalance,
                'savings_rate' => $savingsRate,
                'spent_percentage' => $spentPercentage,
                'categories_breakdown' => $categoriesBreakdown,
                'income_categories_breakdown' => $incomeCategoriesBreakdown,
                'all_time_categories_breakdown' => $allTimeCategoriesBreakdown,
                'all_time_total_spent' => $allTimeTotalSpent,
                'all_time_total_income' => $allTimeTotalIncome,
                'available_months' => $availableMonths,
                'transaction_count' => $transactions->count(),
                'expense_count' => $expenseTransactions->count(),
                'income_count' => $incomeTransactions->count(),
                'stats' => [
                    'top_category' => $categoriesBreakdown[0] ?? null,
                    'category_count' => count($categoriesBreakdown),
                    'average_expense' => $expenseTransactions->count() > 0 ? (int) round($totalSpent / $expenseTransactions->count()) : 0,
                    'average_daily_spend' => $averageDailySpend,
                    'daily_budget_remaining' => $dailyBudgetRemaining,
                    'days_remaining' => $remainingDays,
                ],
            ],
        ];
    }

    /**
     * Build category breakdown list for given transactions.
     *
     * @param  Collection<int, Transaction>  $transactions
     * @return list<array{category_id: ?string, name: string, icon: string, color: string, total: int, percentage: float, count: int}>
     */
    private function buildCategoryBreakdown(Collection $transactions, int $totalAmount): array
    {
        /** @var list<array{category_id: ?string, name: string, icon: string, color: string, total: int, percentage: float, count: int}> */
        return $transactions
            ->groupBy(fn (Transaction $t) => $t->category_id ?? '__none__')
            ->map(function (Collection $group) use ($totalAmount) {
                /** @var Transaction $first */
                $first = $group->first();
                $category = $first->category;
                $catTotal = (int) abs($group->sum('amount'));
                $percentage = $totalAmount > 0 ? round(($catTotal / $totalAmount) * 100, 1) : 0.0;

                return [
                    'category_id' => $category?->id,
                    'name' => $category->name ?? 'Sin categoría',
                    'icon' => $category->icon ?? 'HelpCircle',
                    'color' => $category->color ?? 'stone',
                    'total' => $catTotal,
                    'percentage' => $percentage,
                    'count' => $group->count(),
                ];
            })
            ->sortByDesc('total')
            ->values()
            ->all();
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
