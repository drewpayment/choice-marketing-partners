<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class UpdateEmployeePermissionTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::table('employee_permission', function(Blueprint $table){
        	$table->primary(['employee_id', 'permission_id']);
        	$table->foreign('employee_id')->references('id')->on('employees')
		        ->onUpdate('cascade')->onDelete('cascade');
        	$table->foreign('permission_id')->references('id')->on('permissions')
		        ->onUpdate('cascade')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::disableForeignKeyConstraints();
    	Schema::table('employee_permission', function(Blueprint $table){
		    $table->dropPrimary(['employee_id', 'permission_id']);
		    $table->dropForeign(['employee_id']);
		    $table->dropForeign(['permission_id']);
        });
        Schema::enableForeignKeyConstraints();
    }
}
