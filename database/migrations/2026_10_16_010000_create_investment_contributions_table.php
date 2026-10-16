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
        Schema::create('investment_contributions', function (Blueprint $table) {
            $table->char('id', 36)->primary();
            $table->foreignUuid('account_id')->constrained()->onDelete('cascade');
            $table->foreignUuid('user_id')->constrained()->onDelete('cascade');
            $table->date('contribution_date');
            $table->string('month', 7); // YYYY-MM
            $table->bigInteger('amount'); // in cents/minor units
            $table->string('currency_code', 3);
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['account_id', 'contribution_date']);
            $table->index(['account_id', 'month']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('investment_contributions');
    }
};
