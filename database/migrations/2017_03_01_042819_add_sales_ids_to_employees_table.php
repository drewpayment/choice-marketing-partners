<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class AddSalesIdsToEmployeesTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::table('employees', function(Blueprint $table){
        	$table->integer('sales_id1')->default(0)->after('is_mgr');
        	$table->integer('sales_id2')->default(0)->after('sales_id1');
        	$table->integer('sales_id3')->default(0)->after('sales_id2');
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::table('employees', function(Blueprint $table){
        	$table->dropColumn(['sales_id1', 'sales_id2', 'sales_id3']);
        });
    }
}
