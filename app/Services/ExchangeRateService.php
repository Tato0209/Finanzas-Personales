<?php

namespace App\Services;

use App\Models\ExchangeRate;
use App\Support\Money;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class ExchangeRateService
{
    /** @var array<string, array<string, float>> */
    private array $ratesCache = [];

    /** @var array<string, true> */
    private array $databaseMissCache = [];

    public function __construct(private CurrencyConversionService $currencyApi) {}

    /**
     * Convert an amount in cents from one currency to another on a given date.
     *
     * Uses DB-cached exchange rates, falling back to the external API on cache miss.
     *
     * @param  string  $source  Source currency code (e.g., "EUR")
     * @param  string  $target  Target currency code (e.g., "USD")
     * @param  int  $amountInMinorUnits  Amount in the source currency's minor units
     * @param  string  $date  Date string (YYYY-MM-DD)
     * @return int Amount in the *target* currency's minor units
     */
    public function convert(string $source, string $target, int $amountInMinorUnits, string $date): int
    {
        $source = strtolower($source);
        $target = strtolower($target);

        if ($source === $target || $amountInMinorUnits === 0) {
            return $amountInMinorUnits;
        }

        // Source and target can hold a different number of decimals (COP 0,
        // EUR 2, BTC 8), so the rate is applied in major units and the result
        // rescaled to the target. Applying it to the stored integers directly
        // would be off by a power of ten between any two unequal scales.
        $majorUnits = Money::toMajor($amountInMinorUnits, $source);
        $convertedMajor = $this->convertMajorUnits($majorUnits, $source, $target, $date);

        if ($convertedMajor === null) {
            Log::warning('Exchange rate not found, returning unconverted amount', [
                'source' => $source,
                'target' => $target,
                'date' => $date,
            ]);

            // Unconverted, but still rescaled: the caller reads the result as
            // the target's minor units either way.
            return Money::toMinor($majorUnits, $target);
        }

        return Money::toMinor($convertedMajor, $target);
    }

    /**
     * The same conversion as {@see convert()}, but null when that day holds no
     * rate for the pair.
     *
     * `convert()` answers a missing rate with the amount rescaled but
     * unconverted, which is the right call for a total that must still add up.
     * Callers that either show the figure or write it to a money column need
     * the difference: an unconverted amount printed as a conversion is a lie,
     * and stored as one it is a wrong balance.
     */
    public function convertOrNull(string $source, string $target, int $amountInMinorUnits, string $date): ?int
    {
        if (strcasecmp($source, $target) === 0) {
            return $amountInMinorUnits;
        }

        $majorUnits = Money::toMajor($amountInMinorUnits, $source);
        $convertedMajor = $this->convertMajorUnits($majorUnits, $source, $target, $date);

        if ($convertedMajor === null) {
            return null;
        }

        return Money::toMinor($convertedMajor, $target);
    }

    /**
     * Convert an amount in major units using a 4-tier resolution strategy:
     * 1. Target base rates (1 target = R source -> amount / R)
     * 2. Source base rates (1 source = R target -> amount * R)
     * 3. Triangulation via USD (1 USD = R_target, 1 USD = R_source -> amount * (R_target / R_source))
     * 4. Triangulation via EUR (1 EUR = R_target, 1 EUR = R_source -> amount * (R_target / R_source))
     */
    public function convertMajorUnits(float $majorUnits, string $source, string $target, string $date): ?float
    {
        $source = strtolower($source);
        $target = strtolower($target);

        if ($source === $target) {
            return $majorUnits;
        }

        // 1. Direct via target base: target rates map contains source
        $targetRates = $this->getRates($target, $date);
        if (isset($targetRates[$source]) && (float) $targetRates[$source] > 0) {
            return $majorUnits / (float) $targetRates[$source];
        }

        // 2. Inverse via source base: try if target rates was unavailable, or check cached source rates
        if (empty($targetRates) || $this->hasCachedRates($source, $date)) {
            $sourceRates = $this->getRates($source, $date);
            if (isset($sourceRates[$target]) && (float) $sourceRates[$target] > 0) {
                return $majorUnits * (float) $sourceRates[$target];
            }
        }

        // 3. Triangulation via USD
        if ($source !== 'usd' && $target !== 'usd' && (empty($targetRates) || $this->hasCachedRates('usd', $date))) {
            $usdRates = $this->getRates('usd', $date);
            if (
                isset($usdRates[$source], $usdRates[$target]) &&
                (float) $usdRates[$source] > 0 &&
                (float) $usdRates[$target] > 0
            ) {
                return $majorUnits * ((float) $usdRates[$target] / (float) $usdRates[$source]);
            }
        }

        // 4. Triangulation via EUR
        if ($source !== 'eur' && $target !== 'eur' && (empty($targetRates) || $this->hasCachedRates('eur', $date))) {
            $eurRates = $this->getRates('eur', $date);
            if (
                isset($eurRates[$source], $eurRates[$target]) &&
                (float) $eurRates[$source] > 0 &&
                (float) $eurRates[$target] > 0
            ) {
                return $majorUnits * ((float) $eurRates[$target] / (float) $eurRates[$source]);
            }
        }

        return null;
    }

    private function hasCachedRates(string $currency, string $date): bool
    {
        $currency = strtolower($currency);
        $date = $this->normalizeDate($date);
        $cacheKey = $this->cacheKey($currency, $date);

        if (array_key_exists($cacheKey, $this->ratesCache)) {
            return ! empty($this->ratesCache[$cacheKey]);
        }

        return ExchangeRate::query()
            ->where('base_currency', $currency)
            ->where('date', '<=', $date)
            ->exists();
    }

    /**
     * Get all exchange rates for a base currency on a given date.
     *
     * Checks the DB cache first, then fetches from the external API
     * and stores the result for future lookups.
     *
     * @return array<string, float>
     */
    public function getRates(string $baseCurrency, string $date): array
    {
        $baseCurrency = strtolower($baseCurrency);
        $date = $this->normalizeDate($date);
        $cacheKey = $this->cacheKey($baseCurrency, $date);

        if (array_key_exists($cacheKey, $this->ratesCache)) {
            return $this->ratesCache[$cacheKey];
        }

        if (! isset($this->databaseMissCache[$cacheKey])) {
            $cached = ExchangeRate::query()
                ->where('base_currency', $baseCurrency)
                ->where('date', $date)
                ->first();

            if ($cached) {
                return $this->ratesCache[$cacheKey] = $cached->rates;
            }
        }

        $rates = $this->currencyApi->getRatesForCurrency($baseCurrency, $date);

        if (! empty($rates)) {
            ExchangeRate::query()->upsert([
                [
                    'base_currency' => $baseCurrency,
                    'date' => $date,
                    'rates' => json_encode($rates, JSON_THROW_ON_ERROR),
                ],
            ], uniqueBy: ['base_currency', 'date'], update: ['rates']);
        } else {
            $latestInDb = ExchangeRate::query()
                ->where('base_currency', $baseCurrency)
                ->where('date', '<=', $date)
                ->orderByDesc('date')
                ->first();

            if (! $latestInDb) {
                $latestInDb = ExchangeRate::query()
                    ->where('base_currency', $baseCurrency)
                    ->orderByDesc('date')
                    ->first();
            }

            if ($latestInDb) {
                return $this->ratesCache[$cacheKey] = $latestInDb->rates;
            }
        }

        return $this->ratesCache[$cacheKey] = $rates;
    }

    /**
     * Preload cached exchange rates for many dates in one query.
     *
     * @param  iterable<int, string>  $dates
     */
    public function preloadRates(string $baseCurrency, iterable $dates): void
    {
        $baseCurrency = strtolower($baseCurrency);
        $dates = collect($dates)
            ->map(fn (string $date): string => $this->normalizeDate($date))
            ->unique()
            ->reject(fn (string $date): bool => array_key_exists($this->cacheKey($baseCurrency, $date), $this->ratesCache))
            ->values();

        if ($dates->isEmpty()) {
            return;
        }

        ExchangeRate::query()
            ->where('base_currency', $baseCurrency)
            ->whereIn('date', $dates->all())
            ->get(['base_currency', 'date', 'rates'])
            ->each(function (ExchangeRate $exchangeRate): void {
                $date = $exchangeRate->date->toDateString();
                $this->ratesCache[$this->cacheKey($exchangeRate->base_currency, $date)] = $exchangeRate->rates;
            });

        $dates
            ->reject(fn (string $date): bool => array_key_exists($this->cacheKey($baseCurrency, $date), $this->ratesCache))
            ->each(function (string $date) use ($baseCurrency): void {
                $this->databaseMissCache[$this->cacheKey($baseCurrency, $date)] = true;
            });
    }

    private function normalizeDate(string $date): string
    {
        $today = Carbon::today()->toDateString();

        return $date > $today ? $today : $date;
    }

    private function cacheKey(string $baseCurrency, string $date): string
    {
        return strtolower($baseCurrency).'|'.$date;
    }
}
