<?php

namespace App\Support;

use App\Models\Account;
use App\Models\AccountType as AccountTypeModel;
use JsonSerializable;
use Stringable;

/**
 * @api
 */
class CustomAccountType implements JsonSerializable, Stringable
{
    public string $value;

    protected ?Account $account;

    protected ?AccountTypeModel $model = null;

    protected bool $modelResolved = false;

    public function __construct(string $value, ?Account $account = null)
    {
        $this->value = $value;
        $this->account = $account;
    }

    protected function resolveModel(): ?AccountTypeModel
    {
        if ($this->modelResolved) {
            return $this->model;
        }

        $this->modelResolved = true;

        if ($this->account && $this->account->user_id) {
            $this->model = AccountTypeModel::where('user_id', $this->account->user_id)
                ->where('slug', $this->value)
                ->first();
        } else {
            $this->model = AccountTypeModel::where('slug', $this->value)->first();
        }

        return $this->model;
    }

    /** @api */
    public function hasBalance(): bool
    {
        return true;
    }

    /** @api */
    public function supportsInvestedAmount(): bool
    {
        $model = $this->resolveModel();

        return $model !== null ? $model->supports_invested_amount : false;
    }

    /** @api */
    public function hasTransactionLedger(): bool
    {
        $model = $this->resolveModel();

        return $model !== null ? $model->has_transaction_ledger : true;
    }

    /** @api */
    public function isSetAside(): bool
    {
        return $this->supportsInvestedAmount();
    }

    /** @api */
    public function reducesNetWorth(): bool
    {
        return false;
    }

    /** @api */
    public function countsInNetWorth(): bool
    {
        return true;
    }

    /** @api */
    public function isNonTransactional(): bool
    {
        return ! $this->hasTransactionLedger();
    }

    /** @api */
    public function canSyncBankTransactions(): bool
    {
        return $this->hasTransactionLedger();
    }

    /** @api */
    public function isSalary(): bool
    {
        return false;
    }

    /** @api */
    public function jsonSerialize(): string
    {
        return $this->value;
    }

    public function __toString(): string
    {
        return $this->value;
    }
}
