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
use App\Helpers\RoleType;
use App\Http\Results\OpResult;
use App\Invoice;
use App\Mail\PaystubNotification;
use App\Override;
use App\PayrollRestriction;
use App\Paystub;
use App\Plugins\Facade\PDF;
use App\Vendor;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;

class PaystubService {

	// This needs to run a job that will process paystubs for the date range passed into it.
	// This is super important and critical that the user enters the correct dates.
	// Although critical, I think this still can be assumed from the existing data that we have in SQL.
	#region PAYSTUB PROCESSING

	/**
	 * Gets all unique dates in sql and returns them as an array.
	 * Use the returned array from this function to pass into the batch process
	 * when cleaning up issues in sql for paystubs.
	 *
	 * @return array|mixed
	 */
	public function getUniqueInvoiceDates()
	{
		$dates = Invoice::all()->unique('issue_date')->values()->all();

		return $dates;
	}

	/**
	 * Takes a list of dates and processes paystub inserts into sql
	 *
	 * @param $dates
	 */
	public function batchPaystubProcessing($dates)
	{
		foreach($dates as $d)
		{
			$this->processPaystubJob($d->issue_date);
		}
	}


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
	
	public function get_numeric($val) {
		if (is_numeric($val)) {
			return $val + 0;
		}
		return 0;
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

		if($hasInvoices)
		{
			$weekendDate = $invoices->first()->wkending;
			$iVendors = $allVendors->whereIn('id', $invoices->pluck('vendor')->unique()->values()->all())->all();
			$vendorArrs[] = $iVendors;
		}

		if($hasOverrides)
		{
			$oVendors = $allVendors->whereIn('id', $overrides->pluck('vendor_id')->unique()->values()->all())->all();
			$vendorArrs[] = $oVendors;
		}

		if($hasExpenses)
		{
			$eVendors = $allVendors->whereIn('id', $expenses->pluck('vendor_id')->unique()->values()->all())->all();
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
		$vendors = collect($vendors)->unique('id')->values();

		foreach($vendors as $v)
		{
			$total = 0;
			DB::beginTransaction();

			if ($hasInvoices) {
				$invoice_raw_totals = $invoices->where('vendor', $v['id'])->values()->sum(function ($invoice) {
					return is_numeric($invoice['amount']) ? $invoice['amount'] + 0 : 0;
				});
				$invoice_total_amount = is_numeric($invoice_raw_totals) ? $invoice_raw_totals + 0 : 0;
				$total += $invoice_total_amount;
			}

			if ($hasOverrides) {
				$override_raw_totals = $overrides->where('vendor_id', $v['id'])->values()->sum('total');	
				$override_total_amount = is_numeric($override_raw_totals) ? $override_raw_totals + 0 : 0;
				$total += $override_total_amount;
			}

			if ($hasExpenses) {
				$expense_raw_totals = $expenses->where('vendor_id', $v['id'])->values()->sum('amount');
				$expense_total_amount = is_numeric($expense_raw_totals) ? $expense_raw_totals + 0 : 0;
				$total += $expense_total_amount;	
			}

			$paystub = new Paystub;
			$paystub->agent_id = $agent->id;
			$paystub->agent_name = $agent->name;
			$paystub->vendor_id = $v->id;
			$paystub->vendor_name = $v->name;
			$paystub->amount = $total;
			$paystub->issue_date = $issueDate;
			$paystub->weekend_date = is_null($weekendDate) ? $issueDate : $weekendDate;
			$paystub->modified_by = $modifiedBy;

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
	}

	#endregion

	#region SEARCH PAYSTUBS

	public function checkAccessToIssueDate($employeeId, $date): OpResult
	{
		$result = new OpResult();

		if ($employeeId < 0)
			return $result->setToFail('No active employee record found for authenticated user.');

		$employee = Employee::byEmployeeId($employeeId)->first();

		if ($employee == null) return $result->setToFail();

		if ($employee->is_admin == 1)
		{
			$role = RoleType::Admin;
		}
		else if ($employee->is_mgr == 1)
		{
			$role = RoleType::Manager;
		}
		else
		{
			$role = RoleType::Employee;
		}

		if ($role == RoleType::Admin) return $result->setToSuccess();

		$today = Carbon::now();
		$issueDate = Carbon::parse($date);
		$limit = PayrollRestriction::find(1);

		if ($role == RoleType::Manager || $role == RoleType::Employee)
		{
			$today = $today->setTime($limit->hour, $limit->minute);
			if ($issueDate->isAfter($today))
			{
				$nextWednesday = new Carbon('next wednesday');
				return $result->setData($issueDate->isBefore($nextWednesday)
                    && $issueDate->isAfter($issueDate->subDay()->setTime($limit->hour, $limit->minute)));
			}
			else
			{
				return $result->setToSuccess();
			}
		}
		else
		{
			return $result->setToFail();
		}
	}

	#endregion

	#region SEND PAYSTUBS VIA EMAIL

	/**
	 *
	 *
	 * @param $paystubIds
	 *
	 * @return OpResult
	 */
	public function sendPaystubs($paystubIds): OpResult
	{
		$result = new OpResult();

		$paystubs = Paystub::with('agent')->whereIn('id', $paystubIds)->get();

		try
		{
			foreach ($paystubs as $p)
			{
				$pdfResult = $this->buildPaystubPdf($p->agent_id, $p->vendor_id, $p->issue_date);
				$pdfData = null;

				if (!$pdfResult->hasError())
				{
					$pdfData = $pdfResult->getData()->output();
				}

				Mail::to($p->agent->email)
				    ->queue(new PaystubNotification($p, $pdfData));
			}
		}
		catch (\Exception $e)
		{
			$result->setToFail($e->getMessage());
		}

		return $result;
	}

	/**
	 * @param $agentId
	 * @param $vendorId
	 * @param $issueDate
	 *
	 * @return OpResult
	 */
	public function buildPaystubPdf($agentId, $vendorId, $issueDate): OpResult
	{
		$result = new OpResult();

		$cDate = Carbon::createFromFormat('Y-m-d', $issueDate);
		$date = $cDate->format('Y-m-d');
		$gross = 0;

		$employee = Employee::find($agentId);
		$vendorName = Vendor::find($vendorId)->name;

		$stubs = Invoice::agentId($agentId)
		                ->vendorId($vendorId)
		                ->issueDate($date)
		                ->get();

		foreach ($stubs as $s)
		{
			if (is_numeric($s->amount))
			{
				$gross += $s->amount;
			}

			$s->sale_date = strtotime($s->sale_date);
			$s->sale_date = date('m-d-Y', $s->sale_date);
		}

		$overrides = Override::agentId($agentId)
		                     ->vendorId($vendorId)
		                     ->issueDate($issueDate)
		                     ->get();

		$expenses = Expense::agentId($agentId)
		                   ->vendorId($vendorId)
		                   ->issueDate($issueDate)
		                   ->get();

		$ovrGross = $overrides->sum(function($ovr){
			global $ovrGross;
			return $ovrGross + $ovr->total;
		});

		$expGross = $expenses->sum(function($exp){
			global $expGross;
			return $expGross + $exp->amount;
		});

		$gross = array_sum([$gross, $ovrGross, $expGross]);

		$path = strtolower($employee->name . '_' . $vendorName . '_' . $cDate->format('Ymd') . '.pdf');

		$pdf = PDF::loadView('pdf.template', [
			'stubs' => $stubs,
			'emp' => $employee,
			'gross' => $gross,
			'invoiceDt' => $cDate->format('m-d-Y'),
			'vendor' => $vendorName,
			'overrides' => $overrides,
			'expenses' => $expenses,
			'ovrgross' => $ovrGross,
			'expgross' => $expGross,
			'vendorId' => $vendorId
		]);

		$result->setRawData($pdf);

		return $result;
	}

	#endregion

}