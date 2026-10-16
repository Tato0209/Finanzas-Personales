<?php

namespace App\Models;

use App\Models\Concerns\BelongsToSpace;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * @property string $id
 * @property string $user_id
 * @property string|null $space_id
 * @property string $name
 * @property string $slug
 * @property string $icon
 * @property string|null $color
 * @property bool $has_transaction_ledger
 * @property bool $supports_invested_amount
 * @property bool $is_system_default
 * @property int $position
 */
class AccountType extends Model
{
    use BelongsToSpace, HasFactory, HasUuids, SoftDeletes;

    protected $table = 'account_types';

    protected $fillable = [
        'user_id',
        'space_id',
        'name',
        'slug',
        'icon',
        'color',
        'has_transaction_ledger',
        'supports_invested_amount',
        'is_system_default',
        'position',
    ];

    /** @var list<string> */
    protected $hidden = [
        'space_id',
        'created_at',
        'updated_at',
        'deleted_at',
    ];

    /** @var list<string> */
    protected $appends = [
        'accounts_count',
    ];

    protected function casts(): array
    {
        return [
            'has_transaction_ledger' => 'boolean',
            'supports_invested_amount' => 'boolean',
            'is_system_default' => 'boolean',
            'position' => 'integer',
        ];
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @return HasMany<Account, $this> */
    public function accounts(): HasMany
    {
        return $this->hasMany(Account::class, 'type', 'slug')
            ->where('accounts.user_id', $this->user_id);
    }

    public function getAccountsCountAttribute(): int
    {
        if ($this->relationLoaded('accounts')) {
            return $this->accounts->count();
        }

        return Account::where('user_id', $this->user_id)
            ->where('type', $this->slug)
            ->count();
    }
}
