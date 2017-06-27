<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class UpdateEmployeeUserTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::table('employee_user', function(Blueprint $table){
        	$table->primary(['employee_id', 'user_id']);
        	$table->foreign('employee_id')->references('id')->on('employees')
		        ->onUpdate('cascade')->onDelete('cascade');
        	$table->foreign('user_id')->references('uid')->on('users')
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
	    $table->dropPrimary('PRIMARY');
	    $table->dropForeign('employee_user_employee_id_foreign');
	    $table->dropForeign('employee_user_user_id_foreign');
    }
}
