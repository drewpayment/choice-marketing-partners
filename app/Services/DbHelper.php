<?php

namespace App\Services;

use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class DbHelper
{

	public function RemoveCurrentPayDetailData($data){

		$id = $data['agentID'];
		$date = Carbon::createFromFormat('m-d-Y', $data['issueDate'])->format('Y-m-d-');

		DB::table('payroll')->where([
			['agent_id', '=', $id],
			['pay_date', '=', $date]
		])->delete();
	}

	/*
	 * @param $data
	 *
	 * pass payroll data object to this function, removes current invoices from sql
	 * be sure to only call this within db transaction in case insert statement fails
	 *
	 * @return void
	 *
	 */
	public function RemoveCurrentSalesData($data){

		$id = $data['agentID'];
		$vendor = $data['vendor'];
		$date = Carbon::createFromFormat('m-d-Y', $data['issueDate'])->format('Y-m-d');

		// remove current invoices
		DB::table('invoices')->where([
			['agentid', '=', $id],
			['vendor', '=', $vendor],
			['issue_date', '=', $date]
		])->delete();

		// remove current overrides
		DB::table('overrides')->where([
			['agentid', '=', $id],
			['issue_date', '=', $date]
		])->delete();

		// remove current expenses
		DB::table('expenses')->where([
			['agentid', '=', $id],
			['issue_date', '=', $date]
		])->delete();
	}


	/*
	 * @param $salesArray
	 *
	 * User can pass a structued array of sales data and the function with update and will delete any existing records that match on the table and insert the new records. This is used when the user needs to edit and existing paystub, so that no duplicate sales are inserted into the database.
	 *
	 * @return bool
	 */
	public function InsertSalesArray($salesArray)
	{
		if(count($salesArray) > 0)
		{
			DB::table('invoices')->insert($salesArray);
		}
	}



	/*
	 * @param $overridesArray
	 *
	 * User passes a structured array of overrides to replace the ones in the table.
	 *
	 * @return bool
	 */
	public function InsertOverridesArray($overridesArray)
	{
		if(count($overridesArray) > 0)
		{
			DB::table('overrides')->insert($overridesArray);
		}
	}



	public function InsertExpensesArray($expensesArray)
	{
		if(count($expensesArray) > 0)
		{
			DB::table('expenses')->insert($expensesArray);
		}
	}


	public function InsertPayDetailData($detail)
	{
		DB::table('payroll')->insert($detail);
	}


}