<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class CreatePaystubsTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('paystubs', function (Blueprint $table) {
            $table->increments('id');
            $table->integer('agent_id');
            $table->string('agent_name');
            $table->integer('vendor_id');
            $table->string('vendor_name');
            $table->decimal('amount');
            $table->date('issue_date');
            $table->date('weekend_date');
            $table->integer('modified_by');
            $table->timestamps();

            $table->unique(['agent_id', 'issue_date', 'vendor_id']);
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('paystubs');
    }
}
