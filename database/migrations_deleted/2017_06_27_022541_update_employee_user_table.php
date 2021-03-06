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
	    Schema::table('employee_user', function (Blueprint $table) {
            $table->dropPrimary(['employee_id', 'user_id']);
            $table->dropForeign(['employee_id']);
            $table->dropForeign(['user_id']);
        });
    }
}
