<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class CreateEmployeeInvoiceTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('employee_invoice', function (Blueprint $table) {
            $table->integer('employee_id')->unsigned();
            $table->integer('invoice_id')->unsigned();

            $table->foreign('employee_id')->references('id')->on('employees');
            $table->foreign('invoice_id')->references('invoice_id')->on('invoices');
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
    	Schema::dropIfExists('employee_invoice');
    }
}
