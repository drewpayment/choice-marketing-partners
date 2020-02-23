<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class CreateEmployeeUserTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('employee_user', function(Blueprint $table){
        	$table->unsignedInteger('employee_id');
        	$table->unsignedInteger('user_id');

        	$table->primary(['employee_id', 'user_id']);
        	$table->foreign('employee_id')->references('id')->on('employees');
        	$table->foreign('user_id')->references('uid')->on('users');
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
        Schema::dropIfExists('employee_user');
        Schema::enableForeignKeyConstraints();
    }
}
