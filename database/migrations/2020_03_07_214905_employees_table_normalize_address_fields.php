<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class EmployeesTableNormalizeAddressFields extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->string('address_2')->nullable()->after('address');
            $table->string('city')->nullable()->after('address_2');
            $table->string('state')->nullable()->after('city');
            $table->string('postal_code')->nullable()->after('state');
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        if (Schema::hasColumn('employees', 'address_2')) {
            Schema::table('employees', function (Blueprint $table) {
                $table->dropColumn('address_2');
                $table->dropColumn('city');
                $table->dropColumn('state');
                $table->dropColumn('postal_code');
            });
        }
    }
}
