<?php

namespace Database\Factories;

use App\Models\AccountType;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<AccountType>
 */
class AccountTypeFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $name = fake()->unique()->words(2, true);

        return [
            'name' => ucfirst($name),
            'slug' => Str::slug($name, '_'),
            'icon' => 'wallet',
            'color' => 'blue',
            'has_transaction_ledger' => true,
            'supports_invested_amount' => false,
            'is_system_default' => false,
            'position' => fake()->numberBetween(1, 100),
            'user_id' => User::factory(),
        ];
    }
}
