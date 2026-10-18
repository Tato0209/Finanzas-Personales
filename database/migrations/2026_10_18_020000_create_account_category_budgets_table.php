<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('account_category_budgets', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('user_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('account_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('category_id')->constrained()->cascadeOnDelete();
            $table->string('month', 7)->nullable(); // e.g. '2026-10' or null for recurring default
            $table->bigInteger('allocated_amount')->default(0); // in cents
            $table->string('group_50_30_20', 20)->nullable(); // 'needs', 'wants', 'savings'
            $table->timestamps();

            $table->unique(['account_id', 'category_id', 'month']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('account_category_budgets');
    }
};
