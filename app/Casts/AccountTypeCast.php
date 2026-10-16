<?php

namespace App\Casts;

use App\Enums\AccountType as AccountTypeEnum;
use App\Models\Account;
use App\Support\CustomAccountType;
use Illuminate\Contracts\Database\Eloquent\CastsAttributes;
use Illuminate\Database\Eloquent\Model;

class AccountTypeCast implements CastsAttributes
{
    /**
     * Cast the given value from the database.
     */
    public function get(Model $model, string $key, mixed $value, array $attributes): mixed
    {
        if ($value === null) {
            return null;
        }

        $str = (string) $value;

        $enum = AccountTypeEnum::tryFrom($str);
        if ($enum !== null) {
            return $enum;
        }

        return new CustomAccountType($str, $model instanceof Account ? $model : null);
    }

    /**
     * Prepare the given value for storage.
     */
    public function set(Model $model, string $key, mixed $value, array $attributes): mixed
    {
        if ($value instanceof AccountTypeEnum) {
            return $value->value;
        }

        if ($value instanceof CustomAccountType) {
            return $value->value;
        }

        return $value !== null ? (string) $value : null;
    }
}
