<?php

namespace App\Services;

use App\Actions\SeedDefaultAccountTypes;
use App\Models\AccountType;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;

class AccountTypeService
{
    /**
     * Get all active account types for the given user, seeding defaults if none exist.
     *
     * @return Collection<int, AccountType>
     */
    public function forUser(User $user): Collection
    {
        $types = AccountType::where('user_id', $user->id)
            ->orderBy('position')
            ->orderBy('name')
            ->get();

        if ($types->isEmpty()) {
            app(SeedDefaultAccountTypes::class)->handle($user);

            $types = AccountType::where('user_id', $user->id)
                ->orderBy('position')
                ->orderBy('name')
                ->get();
        }

        return $types;
    }

    /**
     * Get valid account type slugs for the user to validate account creation/updates.
     *
     * @return list<string>
     */
    public function validSlugsForUser(User $user, ?string $currentSlug = null): array
    {
        $slugs = $this->forUser($user)->pluck('slug')->all();

        if ($currentSlug !== null && ! in_array($currentSlug, $slugs, true)) {
            $slugs[] = $currentSlug;
        }

        return array_values(array_unique($slugs));
    }
}
