<?php

use App\Enums\PlanFeature;
use App\Enums\TransactionSource;
use App\Models\User;

beforeEach(function () {
    config(['app.demo' => [
        'enabled' => true,
        'email' => 'demo@finanzaspersonales.local',
        'password' => 'demo',
    ]]);
});

test('demo:reset does nothing when the demo account is disabled', function () {
    config(['app.demo.enabled' => false]);

    $this->artisan('demo:reset')->assertSuccessful();

    expect(User::where('email', 'demo@finanzaspersonales.local')->exists())->toBeFalse();
});

test('demo:reset fails if demo email is not configured', function () {
    config(['app.demo.email' => null]);

    $this->artisan('demo:reset')->assertFailed();
});

test('demo:reset creates demo user with basic data structure', function () {
    $this->artisan('demo:reset')->assertSuccessful();

    $user = User::where('email', 'demo@finanzaspersonales.local')->first();

    // Verify core data exists
    expect($user)->not->toBeNull();
    expect($user->email_verified_at)->not->toBeNull();
    expect($user->accounts()->count())->toBe(6);
    expect($user->transactions()->count())->toBeGreaterThan(2000);
    expect($user->categories()->count())->toBe(64);
})->group('slow');

test('demo:reset verifies existing unverified demo user', function () {
    User::factory()->create([
        'email' => 'demo@finanzaspersonales.local',
        'email_verified_at' => null,
    ]);

    $this->artisan('demo:reset')->assertSuccessful();

    $user = User::where('email', 'demo@finanzaspersonales.local')->first();

    expect($user->email_verified_at)->not->toBeNull();
})->group('slow');

test('demo:reset fails if a password is not passed alongside an explicit email', function () {
    $this->artisan('demo:reset', ['--email' => 'openai-review@finanzaspersonales.local'])->assertFailed();

    expect(User::where('email', 'openai-review@finanzaspersonales.local')->exists())->toBeFalse();
});

test('demo:reset seeds a named reviewer account on the Pro plan with imported transactions', function () {
    config(['subscriptions.enabled' => true]);

    $this->artisan('demo:reset', [
        '--email' => 'openai-review@finanzaspersonales.local',
        '--password' => 'secret-review-password',
        '--imported' => true,
    ])->assertSuccessful();

    $user = User::where('email', 'openai-review@finanzaspersonales.local')->sole();

    expect($user->canUseFeature(PlanFeature::McpAccess))->toBeTrue()
        ->and($user->isDemoAccount())->toBeFalse()
        ->and($user->transactions()->where('source', TransactionSource::ManuallyCreated)->exists())->toBeTrue()
        ->and($user->transactions()->where('source', '!=', TransactionSource::ManuallyCreated)->exists())->toBeTrue();
})->group('slow');

test('demo:reset subscribes a named account even when the public demo account already exists', function () {
    config(['subscriptions.enabled' => true]);

    $this->artisan('demo:reset')->assertSuccessful();

    $this->artisan('demo:reset', [
        '--email' => 'openai-review@finanzaspersonales.local',
        '--password' => 'secret-review-password',
    ])->assertSuccessful();

    $demo = User::where('email', 'demo@finanzaspersonales.local')->sole();
    $reviewer = User::where('email', 'openai-review@finanzaspersonales.local')->sole();

    expect($demo->subscriptions()->count())->toBe(1)
        ->and($reviewer->subscriptions()->count())->toBe(1)
        ->and($reviewer->subscription('default')->stripe_id)
        ->not->toBe($demo->subscription('default')->stripe_id)
        ->and($reviewer->canUseFeature(PlanFeature::McpAccess))->toBeTrue();
})->group('slow');
