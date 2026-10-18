<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property string $id
 * @property string $user_id
 * @property string $account_id
 * @property string $category_id
 * @property ?string $month
 * @property int $allocated_amount
 * @property ?string $group_50_30_20
 */
class AccountCategoryBudget extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'user_id',
        'account_id',
        'category_id',
        'month',
        'allocated_amount',
        'group_50_30_20',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'allocated_amount' => 'integer',
        ];
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @return BelongsTo<Account, $this>
     */
    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }

    /**
     * @return BelongsTo<Category, $this>
     */
    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }
}
