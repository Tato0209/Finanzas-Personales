<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\StoreAccountTypeRequest;
use App\Http\Requests\Settings\UpdateAccountTypeRequest;
use App\Models\AccountType;
use App\Services\AccountTypeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class AccountTypeController extends Controller
{
    public function __construct(
        protected AccountTypeService $accountTypeService
    ) {}

    /**
     * Display the account types settings page.
     */
    public function index(Request $request): Response
    {
        $accountTypes = $this->accountTypeService->forUser($request->user());

        return Inertia::render('settings/account-types', [
            'accountTypes' => $accountTypes,
        ]);
    }

    /**
     * Store a newly created account type.
     */
    public function store(StoreAccountTypeRequest $request): JsonResponse|RedirectResponse
    {
        $user = $request->user();

        $baseSlug = Str::slug($request->name, '_');
        if ($baseSlug === '') {
            $baseSlug = 'tipo_'.Str::lower(Str::random(6));
        }

        $slug = $baseSlug;
        $counter = 1;
        while (AccountType::where('user_id', $user->id)->where('slug', $slug)->exists()) {
            $slug = "{$baseSlug}_{$counter}";
            $counter++;
        }

        $accountType = $user->accountTypes()->create([
            'name' => $request->name,
            'slug' => $slug,
            'icon' => $request->icon,
            'color' => $request->color,
            'has_transaction_ledger' => $request->boolean('has_transaction_ledger'),
            'supports_invested_amount' => $request->boolean('supports_invested_amount'),
            'space_id' => $user->current_space_id,
            'position' => ($user->accountTypes()->max('position') ?? 0) + 1,
        ]);

        if ($request->expectsJson()) {
            return response()->json(['data' => $accountType], 201);
        }

        return to_route('account-types.index')->with('success', __('Tipo de cuenta creado correctamente'));
    }

    /**
     * Update the specified account type.
     */
    public function update(UpdateAccountTypeRequest $request, AccountType $accountType): RedirectResponse
    {
        abort_unless($accountType->user_id === $request->user()->id, 403);

        $accountType->update([
            'name' => $request->name,
            'icon' => $request->icon,
            'color' => $request->color,
            'has_transaction_ledger' => $request->boolean('has_transaction_ledger'),
            'supports_invested_amount' => $request->boolean('supports_invested_amount'),
        ]);

        return to_route('account-types.index')->with('success', __('Tipo de cuenta actualizado correctamente'));
    }

    /**
     * Remove the specified account type.
     */
    public function destroy(Request $request, AccountType $accountType): RedirectResponse
    {
        abort_unless($accountType->user_id === $request->user()->id, 403);

        $accountType->delete();

        return to_route('account-types.index')->with('success', __('Tipo de cuenta eliminado correctamente'));
    }
}
