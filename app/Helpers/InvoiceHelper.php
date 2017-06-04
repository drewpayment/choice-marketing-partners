<?php


namespace App\Helpers;



use Carbon\Carbon;
use Illuminate\Support\Facades\DB;



class InvoiceHelper
{


	/*
	 * Check for existing invoices, return bool
	 *
	 */
	public function checkForExistingInvoice($agentId, $vendor, $date)
	{
		$dt = Carbon::parse($date)->format('Y-m-d');
		$invoices = DB::table('invoices')
					->where([
						['vendor', '=', $vendor],
						['agentid', '=', $agentId],
						['issue_date', '=', $dt]
					])->get();

		if($invoices->count() > 0){
			return true;
		} else {
			return false;
		}

	}



	public function setPayrollData($invoices, $overrides, $expenses, $agentid)
	{
		$total = 0;
		$insert = [];

		if(count($invoices) > 0){
			$insert['agent_name'] = DB::table('employees')->where('id', '=', $invoices[0]['agentid'])->first()->name;
			$insert['pay_date'] = $invoices[0]['issue_date'];
		} else if(count($overrides) > 0){
			$insert['agent_name'] = DB::table('employees')->where('id', '=', $overrides[0]['agentid'])->first()->name;
			$insert['pay_date'] = $overrides[0]['issue_date'];
		} else if(count($expenses) > 0){
			$insert['agent_name'] = DB::table('employees')->where('id', '=', $expenses[0]['agentid'])->first()->name;
			$insert['pay_date'] = $expenses[0]['issue_date'];
		}

		foreach($invoices as $inv)
		{
			$total += $inv['amount'];
		}

		foreach($overrides as $o)
		{
			$total += $o['total'];
		}

		foreach($expenses as $e)
		{
			$total += $e['amount'];
		}

		$insert['agent_id'] = $agentid;
		$insert['amount'] = $total;
		$insert['is_paid'] = 0;
		$insert['created_at'] = date('Y-m-d H:i:s');
		$insert['updated_at'] = date('Y-m-d H:i:s');

		return $insert;
	}



}
