<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class CreateInvoicesTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('invoices', function(Blueprint $table)
        {

            $table->increments('invoice_id');
            $table->integer('id');
            $table->date('sale_date');
            $table->string('first_name', 60);
            $table->string('last_name', 60);
            $table->string('address', 200);
            $table->string('city', 200);
            $table->string('status', 40);
            $table->string('amount');
            $table->integer('agentid');
            $table->date('issue_date');
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
        Schema::dropIfExists('invoices');
    }
}
