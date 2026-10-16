<?php

use App\Models\Account;
use App\Models\AccountType;
use App\Models\User;

use function Pest\Laravel\actingAs;
use function Pest\Laravel\assertDatabaseHas;
use function Pest\Laravel\assertSoftDeleted;

beforeEach(function () {
    $this->user = User::factory()->create();
});

it('displays account types on settings index page', function () {
    actingAs($this->user);

    $response = $this->get(route('account-types.index'));

    $response->assertSuccessful();
    $response->assertInertia(fn ($page) => $page
        ->component('settings/account-types')
        ->has('accountTypes', 9)); // The 9 seeded default types
});

it('can create a new custom account type', function () {
    actingAs($this->user);

    $response = $this->post(route('account-types.store'), [
        'name' => 'Efectivo',
        'icon' => 'coins',
        'has_transaction_ledger' => true,
        'supports_invested_amount' => false,
    ]);

    $response->assertRedirect(route('account-types.index'));
    assertDatabaseHas('account_types', [
        'user_id' => $this->user->id,
        'name' => 'Efectivo',
        'slug' => 'efectivo',
        'icon' => 'coins',
        'has_transaction_ledger' => true,
        'supports_invested_amount' => false,
    ]);
});

it('can update an account type', function () {
    actingAs($this->user);

    $accountType = AccountType::factory()->create([
        'user_id' => $this->user->id,
        'name' => 'Custom Type',
        'slug' => 'custom_type',
        'icon' => 'wallet',
        'has_transaction_ledger' => true,
        'supports_invested_amount' => false,
    ]);

    $response = $this->patch(route('account-types.update', $accountType), [
        'name' => 'Renamed Type',
        'icon' => 'banknote',
        'has_transaction_ledger' => false,
        'supports_invested_amount' => true,
    ]);

    $response->assertRedirect(route('account-types.index'));
    assertDatabaseHas('account_types', [
        'id' => $accountType->id,
        'name' => 'Renamed Type',
        'icon' => 'banknote',
        'has_transaction_ledger' => false,
        'supports_invested_amount' => true,
    ]);
});

it('can delete an account type', function () {
    actingAs($this->user);

    $accountType = AccountType::factory()->create([
        'user_id' => $this->user->id,
        'name' => 'To Delete',
        'slug' => 'to_delete',
    ]);

    $response = $this->delete(route('account-types.destroy', $accountType));

    $response->assertRedirect(route('account-types.index'));
    assertSoftDeleted('account_types', [
        'id' => $accountType->id,
    ]);
});

it('forbids updating another user account type', function () {
    $otherUser = User::factory()->create();
    $accountType = AccountType::factory()->create([
        'user_id' => $otherUser->id,
        'name' => 'Other Type',
        'slug' => 'other_type',
    ]);

    actingAs($this->user);

    $response = $this->patch(route('account-types.update', $accountType), [
        'name' => 'Hacked Name',
        'icon' => 'wallet',
        'has_transaction_ledger' => true,
        'supports_invested_amount' => false,
    ]);

    $response->assertForbidden();
});

it('forbids deleting another user account type', function () {
    $otherUser = User::factory()->create();
    $accountType = AccountType::factory()->create([
        'user_id' => $otherUser->id,
        'name' => 'Other Type',
        'slug' => 'other_type',
    ]);

    actingAs($this->user);

    $response = $this->delete(route('account-types.destroy', $accountType));

    $response->assertForbidden();
});

it('allows creating an account with a custom account type', function () {
    actingAs($this->user);

    $accountType = AccountType::factory()->create([
        'user_id' => $this->user->id,
        'name' => 'Billetera Digital',
        'slug' => 'billetera_digital',
        'icon' => 'wallet',
        'has_transaction_ledger' => true,
        'supports_invested_amount' => false,
    ]);

    $response = $this->post(route('accounts.store'), [
        'name' => 'Mi Billetera',
        'currency_code' => 'USD',
        'type' => 'billetera_digital',
        'balance' => 5000,
    ]);

    $response->assertRedirect();
    assertDatabaseHas('accounts', [
        'user_id' => $this->user->id,
        'name' => 'Mi Billetera',
        'type' => 'billetera_digital',
    ]);

    $account = Account::where('user_id', $this->user->id)
        ->where('name', 'Mi Billetera')
        ->first();

    expect($account->type->value)->toBe('billetera_digital');
    expect($account->type->hasTransactionLedger())->toBeTrue();
});
