<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class CreateExpensesTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('expenses', function(Blueprint $table){

	        $table->increments('expid');
	        $table->string('type');
	        $table->double('amount');
	        $table->string('notes');
	        $table->integer('agentid');
	        $table->date('issue_date');
	        $table->date('wkending');
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
        Schema::dropIfExists('expenses');
    }
}
