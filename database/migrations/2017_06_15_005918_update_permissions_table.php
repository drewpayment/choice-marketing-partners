<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class UpdatePermissionsTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {

        Schema::dropIfExists('permissions');
        Schema::create('permissions', function(Blueprint $table){

        	$table->increments('id');
        	$table->integer('emp_id')->unique();
        	$table->boolean('is_active');
        	$table->timestamps();

        });

        Schema::create('employee_permission', function(Blueprint $table){
        	$table->unsignedInteger('employee_id');
        	$table->unsignedInteger('permission_id');

        	$table->primary(['employee_id', 'permission_id']);
        	$table->foreign('employee_id')->references('id')->on('employees');
        	$table->foreign('permission_id')->references('id')->on('permissions');

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
        Schema::dropIfExists('permission');
        Schema::dropIfExists('employee_permission');
        Schema::enableForeignKeyConstraints();
    }
}
