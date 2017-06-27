<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class UpdateFksEmployeeInvoiceTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::table('employee_invoice', function(Blueprint $table){
        	$table->primary(['employee_id', 'invoice_id']);
        	$table->foreign('employee_id')->references('id')
		        ->on('employees')->onUpdate('cascade')->onDelete('cascade');
        	$table->foreign('invoice_id')->references('invoice_id')
		        ->on('invoices')->onUpdate('cascade')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::table('employee_invoice', function(Blueprint $table){
	        $table->dropPrimary('PRIMARY');
	        $table->dropForeign('employee_invoice_employee_id_foreign');
	        $table->dropForeign('employee_invoice_invoice_id_foreign');
        });
    }
}
