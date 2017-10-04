<?php
/**
 * Created by PhpStorm.
 * User: drewpayment
 * Date: 10/1/17
 * Time: 11:27 PM
 */
namespace App\Services;


use App\Employee;
use App\Expense;
use App\Invoice;
use App\Override;
use App\Paystub;
use App\Vendor;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class PaystubService {

	// This needs to run a job that will process paystubs for the date range passed into it.
	// This is super important and critical that the user enters the correct dates.
	// Although critical, I think this still can be assumed from the existing data that we have in SQL.


	/**
	 * This function should fire off any necessary events to create new paystub
	 * records for the employees based on the issue date passed to the function.
	 * If no issue date is passed, we will try to assume the issue date based on records returned
	 * from today's date.
	 *
	 * @param $issueDate
	 */
	public function processPaystubJob($issueDate)
	{
		$issueDate = isset($issueDate) ? $issueDate : new Carbon();

		// find and delete any existing paystub rows for the issue date
		Paystub::issueDate($issueDate)->delete();

		$agents = Employee::active()->get();
		$vendors = Vendor::all();

		$invoices = Invoice::issueDate($issueDate)->get();
		$overrides = Override::issueDate($issueDate)->get();
		$expenses = Expense::issueDate($issueDate)->get();

		foreach($agents as $a)
		{
			$aInvoices = $invoices->where('agentid', $a->id);
			$aOverrides = $overrides->where('agentid', $a->id);
			$aExpenses = $expenses->where('agentid', $a->id);

			$this->createAgentPaystubRows($a, $aInvoices, $aOverrides, $aExpenses, $issueDate, $vendors);
		}
	}


	/**
	 * Creates paystub record for the agent with valid information from invoices, overrides and expenses as applicable.
	 *
	 * @param \App\Employee $agent
	 * @param \Illuminate\Database\Eloquent\Collection $invoices
	 * @param \Illuminate\Database\Eloquent\Collection $overrides
	 * @param \Illuminate\Database\Eloquent\Collection $expenses
	 * @param datetime $issueDate
	 * @param \Illuminate\Database\Eloquent\Collection $allVendors
	 */
	public function createAgentPaystubRows($agent, $invoices, $overrides, $expenses, $issueDate, $allVendors)
	{
		$modifiedBy = auth()->user();
		$modifiedBy = isset($modifiedBy) ? $modifiedBy->id : 7;
		$hasInvoices = $invoices->isNotEmpty();
		$hasOverrides = $overrides->isNotEmpty();
		$hasExpenses = $expenses->isNotEmpty();
		$vendorArrs = [];
		$weekendDate = null;

		$total = 0;

		if($hasInvoices)
		{
			$weekendDate = $invoices->first()->wkending;
			$total += $invoices->sum('amount');
			$iVendors = $allVendors->whereIn('vendor', $invoices->pluck('vendor')->unique()->values()->all())->all();
			$vendorArrs[] = $iVendors;
		}

		if($hasOverrides)
		{
			$total += $overrides->sum('total');
			$oVendors = $allVendors->whereIn('vendor', $overrides->pluck('vendor_id')->unique()->values()->all())->all();
			$vendorArrs[] = $oVendors;
		}

		if($hasExpenses)
		{
			$total += $expenses->sum('amount');
			$eVendors = $allVendors->whereIn('vendor', $expenses->pluck('vendor_id')->unique()->values()->all())->all();
			$vendorArrs[] = $eVendors;
		}

		$vendors = [];
		foreach($vendorArrs as $innerVendors)
		{
			foreach($innerVendors as $v)
			{
				$vendors[] = $v;
			}
		}
		$vendors = collect($vendors)->unique('vendor_id')->values();

		foreach($vendors as $v)
		{
			$paystub = new Paystub;
			$paystub->agent_id = $agent->id;
			$paystub->agent_name = $agent->name;
			$paystub->vendor_id = $v->id;
			$paystub->vendor_name = $v->name;
			$paystub->amount = $total;
			$paystub->issue_date = $issueDate;
			$paystub->weekend_date = is_null($weekendDate) ? $issueDate : $weekendDate;
			$paystub->modified_by = $modifiedBy;

			DB::beginTransaction();
			try
			{
				$paystub->save();
				DB::commit();
			}
			catch(\mysqli_sql_exception $e)
			{
				DB::rollback();
			}
		}

		// vendors are not being created correctly
	}

}