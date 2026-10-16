<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property string $id
 * @property string $account_id
 * @property string $user_id
 * @property Carbon $contribution_date
 * @property string $month
 * @property int $amount
 * @property string $currency_code
 * @property ?string $notes
 * @property Carbon $created_at
 * @property Carbon $updated_at
 */
class InvestmentContribution extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'account_id',
        'user_id',
        'contribution_date',
        'month',
        'amount',
        'currency_code',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'contribution_date' => 'date:Y-m-d',
            'amount' => 'integer',
        ];
    }

    /** @return BelongsTo<Account, $this> */
    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
