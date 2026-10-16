<?php

namespace App\Http\Controllers;

use App\Enums\AccountType;
use App\Models\Account;
use App\Services\Salary\SalaryStatementService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class SalaryAccountController extends Controller
{
    public function __construct(private SalaryStatementService $salaryStatementService) {}

    public function store(Request $request, Account $account): RedirectResponse
    {
        abort_unless($account->user_id === $request->user()->id, 403);
        abort_unless($account->type === AccountType::Salary, 400, 'Account is not a salary account');

        $validated = $request->validate([
            'month' => ['required', 'string', 'regex:/^\d{4}-\d{2}$/'],
            'amount' => ['required', 'integer', 'min:0'],
        ]);

        $this->salaryStatementService->setMonthlySalary(
            $account,
            $request->user(),
            $validated['month'],
            $validated['amount']
        );

        return back();
    }
}
