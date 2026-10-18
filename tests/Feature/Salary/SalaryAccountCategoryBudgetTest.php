<?php

use App\Enums\AccountType;
use App\Enums\CategoryType;
use App\Models\Account;
use App\Models\AccountCategoryBudget;
use App\Models\Category;
use App\Models\Transaction;
use App\Models\User;

use function Pest\Laravel\actingAs;
use function Pest\Laravel\assertDatabaseHas;

beforeEach(function () {
    $this->user = User::factory()->onboarded()->subscribed()->create();
    $this->salaryAccount = Account::factory()->create([
        'user_id' => $this->user->id,
        'type' => AccountType::Salary,
    ]);
});

it('can set category budgets for a salary account', function () {
    actingAs($this->user);

    $category = Category::factory()->create([
        'user_id' => $this->user->id,
        'name' => 'Supermercado',
        'type' => CategoryType::Expense,
    ]);

    $response = $this->post(route('accounts.category-budgets.store', $this->salaryAccount), [
        'month' => '2026-10',
        'budgets' => [
            [
                'category_id' => $category->id,
                'allocated_amount' => 50000,
                'group_50_30_20' => 'needs',
            ],
        ],
    ]);

    $response->assertRedirect();
    $response->assertSessionHas('success');

    assertDatabaseHas('account_category_budgets', [
        'account_id' => $this->salaryAccount->id,
        'user_id' => $this->user->id,
        'category_id' => $category->id,
        'month' => '2026-10',
        'allocated_amount' => 50000,
        'group_50_30_20' => 'needs',
    ]);
});

it('can apply 50/30/20 automatic preset', function () {
    actingAs($this->user);

    Transaction::factory()->create([
        'account_id' => $this->salaryAccount->id,
        'user_id' => $this->user->id,
        'amount' => 200000,
        'transaction_date' => '2026-10-05',
    ]);

    Category::factory()->create([
        'user_id' => $this->user->id,
        'name' => 'Supermercado',
        'type' => CategoryType::Expense,
    ]);

    $response = $this->post(route('accounts.category-budgets.store', $this->salaryAccount), [
        'month' => '2026-10',
        'preset' => '50_30_20',
    ]);

    $response->assertRedirect();
    $response->assertSessionHas('success');

    expect(AccountCategoryBudget::where('account_id', $this->salaryAccount->id)->count())->toBeGreaterThan(0);
});

it('prevents modifying category budgets on another users account', function () {
    $otherUser = User::factory()->onboarded()->subscribed()->create();
    actingAs($otherUser);

    $response = $this->post(route('accounts.category-budgets.store', $this->salaryAccount), [
        'month' => '2026-10',
        'preset' => '50_30_20',
    ]);

    $response->assertForbidden();
});
