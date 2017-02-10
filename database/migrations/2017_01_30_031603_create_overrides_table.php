<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class CreateOverridesTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('overrides', function(Blueprint $table){

        	$table->increments('ovrid');
        	$table->integer('id');
        	$table->string('name');
        	$table->integer('sales');
        	$table->integer('commission');
        	$table->integer('total');
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
        Schema::dropIfExists('overrides');
    }
}
