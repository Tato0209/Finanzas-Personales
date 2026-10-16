<?php

namespace App\Actions;

use App\Models\AccountType;
use App\Models\User;

class SeedDefaultAccountTypes
{
    /**
     * Seed default account types for the user if they don't already exist.
     */
    public function handle(User $user): void
    {
        $defaults = [
            [
                'name' => 'Cuenta corriente',
                'slug' => 'checking',
                'icon' => 'wallet',
                'color' => 'blue',
                'has_transaction_ledger' => true,
                'supports_invested_amount' => false,
                'is_system_default' => true,
                'position' => 1,
            ],
            [
                'name' => 'Ahorros',
                'slug' => 'savings',
                'icon' => 'piggy-bank',
                'color' => 'emerald',
                'has_transaction_ledger' => true,
                'supports_invested_amount' => true,
                'is_system_default' => true,
                'position' => 2,
            ],
            [
                'name' => 'Salario',
                'slug' => 'salary',
                'icon' => 'banknote',
                'color' => 'green',
                'has_transaction_ledger' => true,
                'supports_invested_amount' => false,
                'is_system_default' => true,
                'position' => 3,
            ],
            [
                'name' => 'Inversión',
                'slug' => 'investment',
                'icon' => 'line-chart',
                'color' => 'indigo',
                'has_transaction_ledger' => false,
                'supports_invested_amount' => true,
                'is_system_default' => true,
                'position' => 4,
            ],
            [
                'name' => 'Tarjeta de crédito',
                'slug' => 'credit_card',
                'icon' => 'credit-card',
                'color' => 'amber',
                'has_transaction_ledger' => true,
                'supports_invested_amount' => false,
                'is_system_default' => true,
                'position' => 5,
            ],
            [
                'name' => 'Préstamo',
                'slug' => 'loan',
                'icon' => 'building-2',
                'color' => 'orange',
                'has_transaction_ledger' => false,
                'supports_invested_amount' => false,
                'is_system_default' => true,
                'position' => 6,
            ],
            [
                'name' => 'Bienes raíces',
                'slug' => 'real_estate',
                'icon' => 'home',
                'color' => 'violet',
                'has_transaction_ledger' => false,
                'supports_invested_amount' => false,
                'is_system_default' => true,
                'position' => 7,
            ],
            [
                'name' => 'Jubilación / Pensión',
                'slug' => 'retirement',
                'icon' => 'trending-up',
                'color' => 'cyan',
                'has_transaction_ledger' => false,
                'supports_invested_amount' => true,
                'is_system_default' => true,
                'position' => 8,
            ],
            [
                'name' => 'Otros',
                'slug' => 'others',
                'icon' => 'folder-kanban',
                'color' => 'zinc',
                'has_transaction_ledger' => true,
                'supports_invested_amount' => false,
                'is_system_default' => true,
                'position' => 9,
            ],
        ];

        foreach ($defaults as $data) {
            AccountType::firstOrCreate(
                [
                    'user_id' => $user->id,
                    'slug' => $data['slug'],
                ],
                array_merge($data, [
                    'user_id' => $user->id,
                    'space_id' => $user->current_space_id,
                ])
            );
        }
    }
}
