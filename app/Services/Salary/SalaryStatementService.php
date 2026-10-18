<?php

namespace App\Services\Salary;

use App\Enums\AccountType;
use App\Enums\CategoryType;
use App\Enums\TransactionSource;
use App\Models\Account;
use App\Models\AccountCategoryBudget;
use App\Models\Category;
use App\Models\Transaction;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class SalaryStatementService
{
    /**
     * Classify a category into the 50/30/20 rule:
     * - 'needs': Essential living costs (50%)
     * - 'wants': Lifestyle, entertainment, dining out (30%)
     * - 'savings': Savings, investments, debt payment (20%)
     */
    private static function classifyCategory(string $categoryName, ?string $categoryType = null): string
    {
        $name = mb_strtolower($categoryName);

        if ($categoryType === 'savings' || $categoryType === 'investment') {
            return 'savings';
        }

        if (str_contains($name, 'ahorro') || str_contains($name, 'invers') || str_contains($name, 'tarjeta de crédito') || str_contains($name, 'préstamo')) {
            return 'savings';
        }

        $needKeywords = [
            'aliment', 'supermercado', 'alquiler', 'hipoteca', 'electricidad', 'luz', 'gas', 'agua',
            'teléfono', 'internet', 'transporte', 'combustible', 'gasolina', 'salud', 'farmacia',
            'seguro', 'impuesto', 'factura', 'hogar', 'mantenimiento', 'educación',
        ];

        foreach ($needKeywords as $keyword) {
            if (str_contains($name, $keyword)) {
                return 'needs';
            }
        }

        return 'wants';
    }

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

        // 1. Fetch transactions for selected period
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

        // 2. Load category budgets defined by the user for this account
        $budgetModels = AccountCategoryBudget::where('account_id', $account->id)
            ->where(function ($q) use ($selectedMonth, $isAllTime) {
                if ($isAllTime) {
                    $q->whereNull('month');
                } else {
                    $q->where('month', $selectedMonth)->orWhereNull('month');
                }
            })
            ->get()
            ->sortByDesc(fn (AccountCategoryBudget $b) => $b->month !== null ? 1 : 0)
            ->unique('category_id');

        $budgetsByCategoryId = $budgetModels->keyBy('category_id');

        // 3. Build budget-aware category list
        $expensesByCategoryId = $expenseTransactions->groupBy(fn (Transaction $t) => $t->category_id ?? '__none__');

        // All active categories for user (for assigning budgets)
        $allUserCategories = Category::where('user_id', $user->id)
            ->whereIn('type', [CategoryType::Expense, CategoryType::Savings, CategoryType::Investment])
            ->orderBy('name')
            ->get();

        $allCategoryIds = collect($expensesByCategoryId->keys())
            ->merge($budgetsByCategoryId->keys())
            ->unique()
            ->values();

        $budgetCategories = $allCategoryIds->map(function ($catId) use ($expensesByCategoryId, $budgetsByCategoryId, $allUserCategories) {
            $txGroup = $expensesByCategoryId->get($catId, collect());
            $firstTx = $txGroup->first();
            $category = $firstTx instanceof Transaction ? $firstTx->category : null;
            if (! $category instanceof Category) {
                $category = $allUserCategories->firstWhere('id', $catId);
            }

            $catName = ($category instanceof Category) ? $category->name : 'Sin categoría';
            $catIcon = ($category instanceof Category) ? ($category->icon ?? 'HelpCircle') : 'HelpCircle';
            $catColor = ($category instanceof Category) ? ($category->color ?? 'stone') : 'stone';
            $catType = ($category instanceof Category) ? $category->type->value : 'expense';
            $categoryId = ($category instanceof Category) ? $category->id : null;

            $spentAmount = (int) abs($txGroup->sum('amount'));
            $budgetModel = $budgetsByCategoryId->get($catId);
            $allocatedAmount = ($budgetModel instanceof AccountCategoryBudget) ? (int) $budgetModel->allocated_amount : 0;

            $group = ($budgetModel instanceof AccountCategoryBudget && $budgetModel->group_50_30_20)
                ? $budgetModel->group_50_30_20
                : self::classifyCategory($catName, $catType);
            $remainingAmount = $allocatedAmount > 0 ? ($allocatedAmount - $spentAmount) : 0;
            $spentPct = $allocatedAmount > 0 ? round(($spentAmount / $allocatedAmount) * 100, 1) : 0.0;
            $isOver = $allocatedAmount > 0 && $spentAmount > $allocatedAmount;

            return [
                'category_id' => $categoryId,
                'name' => $catName,
                'icon' => $catIcon,
                'color' => $catColor,
                'group_50_30_20' => $group,
                'allocated_amount' => $allocatedAmount,
                'spent_amount' => $spentAmount,
                'remaining_amount' => $remainingAmount,
                'spent_percentage' => $spentPct,
                'is_over_budget' => $isOver,
                'transaction_count' => $txGroup->count(),
            ];
        })
            ->sortByDesc('spent_amount')
            ->values();

        // 4. Calculate 50/30/20 summary
        $needsTarget = (int) round($salaryAmount * 0.50);
        $wantsTarget = (int) round($salaryAmount * 0.30);
        $savingsTarget = (int) round($salaryAmount * 0.20);

        $needsSpent = (int) $budgetCategories->where('group_50_30_20', 'needs')->sum('spent_amount');
        $wantsSpent = (int) $budgetCategories->where('group_50_30_20', 'wants')->sum('spent_amount');
        $savingsSpent = (int) $budgetCategories->where('group_50_30_20', 'savings')->sum('spent_amount');

        $needsAllocated = (int) $budgetCategories->where('group_50_30_20', 'needs')->sum('allocated_amount');
        $wantsAllocated = (int) $budgetCategories->where('group_50_30_20', 'wants')->sum('allocated_amount');
        $savingsAllocated = (int) $budgetCategories->where('group_50_30_20', 'savings')->sum('allocated_amount');

        $summary503020 = [
            'needs' => [
                'key' => 'needs',
                'name' => 'Necesidades básicas (50%)',
                'target_amount' => $needsTarget,
                'target_percentage' => 50,
                'allocated_amount' => $needsAllocated,
                'spent_amount' => $needsSpent,
                'remaining_amount' => $needsTarget - $needsSpent,
                'spent_percentage' => $needsTarget > 0 ? round(($needsSpent / $needsTarget) * 100, 1) : 0.0,
            ],
            'wants' => [
                'key' => 'wants',
                'name' => 'Deseos y estilo de vida (30%)',
                'target_amount' => $wantsTarget,
                'target_percentage' => 30,
                'allocated_amount' => $wantsAllocated,
                'spent_amount' => $wantsSpent,
                'remaining_amount' => $wantsTarget - $wantsSpent,
                'spent_percentage' => $wantsTarget > 0 ? round(($wantsSpent / $wantsTarget) * 100, 1) : 0.0,
            ],
            'savings' => [
                'key' => 'savings',
                'name' => 'Ahorro e inversión (20%)',
                'target_amount' => $savingsTarget,
                'target_percentage' => 20,
                'allocated_amount' => $savingsAllocated,
                'spent_amount' => $savingsSpent,
                'remaining_amount' => $savingsTarget - $savingsSpent,
                'spent_percentage' => $savingsTarget > 0 ? round(($savingsSpent / $savingsTarget) * 100, 1) : 0.0,
            ],
        ];

        $totalAllocated = (int) $budgetCategories->sum('allocated_amount');
        $unallocatedSalary = max(0, $salaryAmount - $totalAllocated);

        // 5. Category breakdown for expenses
        $categoriesBreakdown = $this->buildCategoryBreakdown($expenseTransactions, $totalSpent);

        // 6. Category breakdown for incomes
        $incomeCategoriesBreakdown = $this->buildCategoryBreakdown($incomeTransactions, $salaryAmount);

        // 7. All-time calculations
        /** @var Collection<int, Transaction> $allTransactions */
        $allTransactions = $account->transactions()->with(['category'])->get();
        $allExpenses = $allTransactions->filter(fn (Transaction $t) => $t->amount < 0);
        $allIncomes = $allTransactions->filter(fn (Transaction $t) => $t->amount > 0);
        $allTimeTotalSpent = (int) abs($allExpenses->sum('amount'));
        $allTimeTotalIncome = (int) $allIncomes->sum('amount');
        $allTimeCategoriesBreakdown = $this->buildCategoryBreakdown($allExpenses, $allTimeTotalSpent);

        // 8. Month stats
        $daysInMonth = (int) $startOfMonth->daysInMonth;
        $currentDay = $now->isSameMonth($startOfMonth) ? min((int) $now->day, $daysInMonth) : ($now->isAfter($endOfMonth) ? $daysInMonth : 1);
        $remainingDays = $now->isSameMonth($startOfMonth) ? max(1, $daysInMonth - (int) $now->day) : 1;
        $averageDailySpend = $currentDay > 0 ? (int) round($totalSpent / $currentDay) : 0;
        $dailyBudgetRemaining = $remainingBalance > 0 ? (int) round($remainingBalance / $remainingDays) : 0;

        // 9. Available months with transactions for this account
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

        // 10. Formatted list of all user categories with current budget assignment
        $categoriesWithBudgets = $allUserCategories->map(function (Category $c) use ($budgetsByCategoryId) {
            $existingBudget = $budgetsByCategoryId->get($c->id);
            $allocatedAmount = ($existingBudget instanceof AccountCategoryBudget) ? (int) $existingBudget->allocated_amount : 0;
            $group = ($existingBudget instanceof AccountCategoryBudget && $existingBudget->group_50_30_20)
                ? $existingBudget->group_50_30_20
                : self::classifyCategory($c->name, $c->type->value);

            return [
                'id' => $c->id,
                'name' => $c->name,
                'icon' => $c->icon ?? 'HelpCircle',
                'color' => $c->color ?? 'stone',
                'group_50_30_20' => $group,
                'allocated_amount' => $allocatedAmount,
            ];
        })->values()->all();

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
                'total_allocated' => $totalAllocated,
                'unallocated_salary' => $unallocatedSalary,
                'budget_categories' => $budgetCategories->all(),
                'summary_50_30_20' => $summary503020,
                'user_categories_options' => $categoriesWithBudgets,
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
     * Apply the 50/30/20 budget preset for this account and month.
     */
    public function apply503020Preset(Account $account, User $user, ?string $month): void
    {
        $now = Carbon::now();
        $targetMonth = $month ?: $now->format('Y-m');
        $startOfMonth = Carbon::parse($targetMonth.'-01')->startOfMonth();
        $endOfMonth = $startOfMonth->copy()->endOfMonth();

        // 1. Get salary amount for this month
        $salaryAmount = (int) $account->transactions()
            ->whereBetween('transaction_date', [$startOfMonth->toDateString(), $endOfMonth->toDateString()])
            ->where('amount', '>', 0)
            ->sum('amount');

        if ($salaryAmount <= 0) {
            return;
        }

        $needsBudget = (int) round($salaryAmount * 0.50);
        $wantsBudget = (int) round($salaryAmount * 0.30);
        $savingsBudget = (int) round($salaryAmount * 0.20);

        // 2. Fetch categories
        $categories = Category::where('user_id', $user->id)
            ->whereIn('type', [CategoryType::Expense, CategoryType::Savings, CategoryType::Investment])
            ->get();

        $needsCats = $categories->filter(fn (Category $c) => self::classifyCategory($c->name, $c->type->value ?? 'expense') === 'needs')->values();
        $wantsCats = $categories->filter(fn (Category $c) => self::classifyCategory($c->name, $c->type->value ?? 'expense') === 'wants')->values();
        $savingsCats = $categories->filter(fn (Category $c) => self::classifyCategory($c->name, $c->type->value ?? 'expense') === 'savings')->values();

        // 3. Clear existing budgets for this month
        AccountCategoryBudget::where('account_id', $account->id)
            ->where('month', $month)
            ->delete();

        // 4. Distribute needs
        if ($needsCats->isNotEmpty()) {
            $perCat = (int) round($needsBudget / $needsCats->count());
            foreach ($needsCats as $cat) {
                AccountCategoryBudget::create([
                    'user_id' => $user->id,
                    'account_id' => $account->id,
                    'category_id' => $cat->id,
                    'month' => $month,
                    'allocated_amount' => $perCat,
                    'group_50_30_20' => 'needs',
                ]);
            }
        }

        // 5. Distribute wants
        if ($wantsCats->isNotEmpty()) {
            $perCat = (int) round($wantsBudget / $wantsCats->count());
            foreach ($wantsCats as $cat) {
                AccountCategoryBudget::create([
                    'user_id' => $user->id,
                    'account_id' => $account->id,
                    'category_id' => $cat->id,
                    'month' => $month,
                    'allocated_amount' => $perCat,
                    'group_50_30_20' => 'wants',
                ]);
            }
        }

        // 6. Distribute savings
        if ($savingsCats->isNotEmpty()) {
            $perCat = (int) round($savingsBudget / $savingsCats->count());
            foreach ($savingsCats as $cat) {
                AccountCategoryBudget::create([
                    'user_id' => $user->id,
                    'account_id' => $account->id,
                    'category_id' => $cat->id,
                    'month' => $month,
                    'allocated_amount' => $perCat,
                    'group_50_30_20' => 'savings',
                ]);
            }
        }
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
