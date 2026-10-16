<?php

use App\Jobs\Drip\SendInactiveNoBankEmailJob;
use App\Models\McpToolCall;
use App\Models\User;
use App\Services\Stats\SubscriptionFunnelCollector;
use Illuminate\Support\Facades\Bus;

/**
 * The demo and press accounts are fixtures: their MCP traffic is demo traffic,
 * their seeded subscription is not revenue and their inbox is nobody's. Every
 * metric and automated e-mail has to leave them out, or a press round quietly
 * moves the numbers pricing decisions are taken on.
 */
beforeEach(function () {
    config([
        'app.demo.email' => 'demo@finanzaspersonales.local',
        'app.press.email' => 'prensa@finanzaspersonales.local',
    ]);
});

it('lists the shared accounts', function () {
    expect(User::sharedAccountEmails())
        ->toBe(['demo@finanzaspersonales.local', 'prensa@finanzaspersonales.local']);
});

it('keeps shared-account calls out of the MCP usage report', function () {
    $press = User::factory()->create(['email' => 'prensa@finanzaspersonales.local']);
    $demo = User::factory()->create(['email' => 'demo@finanzaspersonales.local']);
    $real = User::factory()->create(['email' => 'real@example.com']);

    McpToolCall::factory()->count(5)->create(['user_id' => $press->id, 'tool' => 'search_transactions']);
    McpToolCall::factory()->count(3)->create(['user_id' => $demo->id, 'tool' => 'search_transactions']);
    McpToolCall::factory()->create(['user_id' => $real->id, 'tool' => 'get_net_worth']);

    $this->artisan('stats:mcp-usage', ['--days' => 30])
        ->expectsOutputToContain('Calls: 1')
        ->assertSuccessful();
});

it('reports no usage at all when only the shared accounts called the MCP', function () {
    $press = User::factory()->create(['email' => 'prensa@finanzaspersonales.local']);
    McpToolCall::factory()->count(4)->create(['user_id' => $press->id, 'tool' => 'list_budgets']);

    $this->artisan('stats:mcp-usage')
        ->expectsOutputToContain('No MCP tool calls')
        ->assertSuccessful();
});

it('keeps the seeded subscriptions out of the subscription funnel', function () {
    config(['subscriptions.enabled' => true, 'ai_suggestions.report.excluded_emails' => []]);

    foreach (['prensa@finanzaspersonales.local', 'demo@finanzaspersonales.local'] as $email) {
        $user = User::factory()->create(['email' => $email, 'created_at' => now()->subDays(2)]);
        $user->subscriptions()->create([
            'type' => 'default',
            'stripe_id' => "sub_press_{$user->id}",
            'stripe_status' => 'active',
            'stripe_price' => 'price_demo_free',
        ]);
    }

    $report = app(SubscriptionFunnelCollector::class)->collect();

    expect(array_sum(array_column($report['weeks'], 'registered')))->toBe(0)
        ->and(array_sum(array_column($report['weeks'], 'subscribed')))->toBe(0);
});

it('does not send drip emails to a shared account', function () {
    Bus::fake();
    $this->freezeTime();

    User::factory()->onboarded()->create([
        'email' => 'prensa@finanzaspersonales.local',
        'last_active_at' => now()->subDays(7),
    ]);

    $this->artisan('email:inactive-no-bank')->assertSuccessful();

    Bus::assertNotDispatched(SendInactiveNoBankEmailJob::class);
});
