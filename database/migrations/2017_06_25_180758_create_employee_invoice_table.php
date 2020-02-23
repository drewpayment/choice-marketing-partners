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
            $table->unsignedInteger('employee_id');
            $table->unsignedInteger('invoice_id');

            $table->primary(['employee_id', 'invoice_id']);
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
        Schema::disableForeignKeyConstraints();
        Schema::dropIfExists('employee_invoice');
        Schema::enableForeignKeyConstraints();
    }
}
