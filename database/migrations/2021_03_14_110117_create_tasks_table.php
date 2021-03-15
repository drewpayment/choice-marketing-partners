<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateTasksTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('tasks', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->string('notes')->nullable();
            $table->dateTime('due_date');
            $table->boolean('is_complete')->default(false);
            $table->integer('created_by_user_id')->unsigned();
            $table->foreign('created_by_user_id')
	            ->references('uid')
	            ->on('users');
            $table->integer('assigned_to_user_id')->unsigned()->nullable();
            $table->foreign('assigned_to_user_id')
	            ->references('uid')
	            ->on('users');
            $table->timestamps();
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
        Schema::drop('tasks');
        Schema::enableForeignKeyConstraints();
    }
}
