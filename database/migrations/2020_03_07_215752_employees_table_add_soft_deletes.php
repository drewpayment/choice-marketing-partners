<?php

use App\Employee;
use Carbon\Carbon;
use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class EmployeesTableAddSoftDeletes extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->softDeletes();
        });

        if (Schema::hasColumn('employees', 'deleted_at')) {
            Employee::where('is_active', '=', 0)->update([
                'deleted_at' => Carbon::now()->format('Y-m-d')
            ]);
        }
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->dropSoftDeletes();
        });
    }
}
