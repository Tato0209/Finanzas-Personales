<?php

namespace App\Http\Controllers;

use App\Models\Account;
use App\Models\InvestmentContribution;
use App\Services\Investment\InvestmentContributionService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class InvestmentContributionController extends Controller
{
    public function __construct(private InvestmentContributionService $contributionService) {}

    public function store(Request $request, Account $account): RedirectResponse
    {
        abort_unless($account->user_id === $request->user()->id, 403);

        $validated = $request->validate([
            'contribution_date' => ['required', 'date'],
            'amount' => ['required', 'integer', 'min:1'],
            'notes' => ['nullable', 'string', 'max:255'],
            'add_to_balance' => ['nullable', 'boolean'],
            'add_to_invested' => ['nullable', 'boolean'],
        ]);

        $this->contributionService->recordContribution(
            $account,
            $request->user(),
            $validated
        );

        return back();
    }

    public function update(Request $request, Account $account, InvestmentContribution $contribution): RedirectResponse
    {
        abort_unless($account->user_id === $request->user()->id, 403);
        abort_unless($contribution->account_id === $account->id, 404);

        $validated = $request->validate([
            'contribution_date' => ['required', 'date'],
            'amount' => ['required', 'integer', 'min:1'],
            'notes' => ['nullable', 'string', 'max:255'],
            'sync_balance' => ['nullable', 'boolean'],
        ]);

        $this->contributionService->updateContribution(
            $account,
            $contribution,
            $validated
        );

        return back();
    }

    public function destroy(Request $request, Account $account, InvestmentContribution $contribution): RedirectResponse
    {
        abort_unless($account->user_id === $request->user()->id, 403);
        abort_unless($contribution->account_id === $account->id, 404);

        $adjustBalance = $request->boolean('adjust_balance', false);

        $this->contributionService->deleteContribution(
            $account,
            $contribution,
            $adjustBalance
        );

        return back();
    }
}
