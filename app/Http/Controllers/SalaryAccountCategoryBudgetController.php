<?php

namespace App\Http\Controllers;

use App\Enums\AccountType;
use App\Models\Account;
use App\Models\AccountCategoryBudget;
use App\Services\Salary\SalaryStatementService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class SalaryAccountCategoryBudgetController extends Controller
{
    public function __construct(private SalaryStatementService $salaryStatementService) {}

    public function store(Request $request, Account $account): RedirectResponse
    {
        abort_unless($account->user_id === $request->user()->id, 403);
        $isSalary = $account->type === AccountType::Salary
            || in_array($account->type->value, ['salary', 'salario'], true);
        abort_unless($isSalary, 400, 'Account is not a salary account');

        $validated = $request->validate([
            'month' => ['required', 'string', 'regex:/^(\d{4}-\d{2}|default|all)$/'],
            'budgets' => ['nullable', 'array'],
            'budgets.*.category_id' => ['required', 'uuid', 'exists:categories,id'],
            'budgets.*.allocated_amount' => ['required', 'integer', 'min:0'],
            'budgets.*.group_50_30_20' => ['nullable', 'string', 'in:needs,wants,savings'],
            'preset' => ['nullable', 'string', 'in:50_30_20,clear'],
        ]);

        $targetMonth = ($validated['month'] === 'default' || $validated['month'] === 'all') ? null : $validated['month'];

        if (($validated['preset'] ?? null) === 'clear') {
            AccountCategoryBudget::where('account_id', $account->id)
                ->where('month', $targetMonth)
                ->delete();

            return back()->with('success', 'Presupuestos restablecidos correctamente.');
        }

        if (($validated['preset'] ?? null) === '50_30_20') {
            $this->salaryStatementService->apply503020Preset($account, $request->user(), $targetMonth);

            return back()->with('success', 'Regla 50/30/20 aplicada correctamente.');
        }

        if (! empty($validated['budgets'])) {
            foreach ($validated['budgets'] as $item) {
                AccountCategoryBudget::updateOrCreate(
                    [
                        'account_id' => $account->id,
                        'category_id' => $item['category_id'],
                        'month' => $targetMonth,
                    ],
                    [
                        'user_id' => $request->user()->id,
                        'allocated_amount' => $item['allocated_amount'],
                        'group_50_30_20' => $item['group_50_30_20'] ?? null,
                    ]
                );
            }
        }

        return back()->with('success', 'Presupuestos guardados correctamente.');
    }
}
