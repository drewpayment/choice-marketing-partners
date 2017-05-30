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



}
