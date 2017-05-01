<?php

namespace App\Serivces;

use DebugBar\DebugBar;
use Doctrine\Common\Util\Debug;
use Illuminate\Support\Facades\DB;

class DbHelper
{


	/*
	 * @param $salesArray
	 *
	 * User can pass a structued array of sales data and the function with update and will delete any existing records that match on the table and insert the new records. This is used when the user needs to edit and existing paystub, so that no duplicate sales are inserted into the database.
	 *
	 * @return bool
	 */
	public function DeleteAndInsertSalesArray($salesArray)
	{
		if(count($salesArray) > 0)
		{
			DB::table('invoices')->where([
				['agentid', '=', $salesArray[0]['agentid']],
				['vendor', '=', $salesArray[0]['vendor']],
				['issue_date', '=', $salesArray[0]['issue_date']]
			])->delete();
			DB::table('invoices')->insert($salesArray);

			return true;
		}
		else
		{
			return false;
		}
	}



	/*
	 * @param $overridesArray
	 *
	 * User passes a structured array of overrides to replace the ones in the table.
	 *
	 * @return bool
	 */
	public function DeleteAndInsertOverridesArray($overridesArray)
	{
		if(count($overridesArray) > 0)
		{
			DB::table('overrides')->where([
				['agentid', '=', $overridesArray[0]['agentid']],
				['issue_date', '=', $overridesArray[0]['issue_date']]
			])->delete();
			DB::table('overrides')->insert($overridesArray);

			return true;
		}
		else
		{
			return false;
		}
	}



	public function DeleteAndInsertExpensesArray($expensesArray)
	{
		return $expensesArray;
		if(count($expensesArray) > 0)
		{
			DB::table('expenses')->where([
				['agentid', '=', $expensesArray[0]['agentid']],
				['issue_date', '=', $expensesArray[0]['issue_date']]
			])->delete();
			Debugbar::addMessage('Delete', 'Worked!');
			DB::table('expenses')->insert($expensesArray);

			return true;
		}
		else
		{
			return false;
		}
	}


}