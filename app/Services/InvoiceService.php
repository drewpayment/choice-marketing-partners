<?php
/**
 * Created by PhpStorm.
 * User: drewpayment
 * Date: 9/28/17
 * Time: 12:32 AM
 */

namespace App\Services;


use App\Employee;
use App\Expense;
use App\Helpers\InvoiceHelper;
use App\Invoice;
use App\Override;
use App\Payroll;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class InvoiceService {

	protected $invoiceHelper;

	/**
	 * InvoiceService constructor. Used to inject helpers.
	 *
	 * @param InvoiceHelper $invoice_helper
	 */
	public function __construct(InvoiceHelper $invoice_helper)
	{
		$this->invoiceHelper = $invoice_helper;
	}

	/**
	 * Edit exist invoice.
	 *
	 * @param $input
	 *
	 * @return array
	 */
	public function editInvoice($input)
	{
		$result = [];
		$hasExpenses = $input['hasExpenses'];
		$hasOverrides = $input['hasOverrides'];
		$sales = (isset($input['individual'])) ? $input['individual'] : [];
		$vendorId = $input['vendorId'];
		$employeeId = $input['employeeId'];
		$date = $input['date'];
		$endDate = $input['endDate'];
		$overrides = ($hasOverrides === 'true') ? $input['overrides'] : [];
		$expenses = ($hasExpenses === 'true') ? $input['expenses'] : [];

		$existingInvoice = $this->invoiceHelper->checkForExistingInvoice($employeeId, $vendorId, $date);
		if($existingInvoice === true) {

			DB::beginTransaction();
			try{
				Invoice::agentId($employeeId)->vendorId($vendorId)->issueDate($date)->delete();
				Payroll::agentId($employeeId)->vendorId($vendorId)->issueDate($date)->delete();

				if($hasOverrides) Override::agentId($employeeId)->vendorId($vendorId)->issueDate($date)->delete();
				if($hasExpenses) Expense::agentId($employeeId)->vendorId($vendorId)->issueDate($date)->delete();

				DB::commit();
			} catch (\mysqli_sql_exception $e) {
				DB::rollback();

				$result['status'] = false;
				$result['message'] = 'A SQL error has occurred, please try again. If the problem persists, please email your development team.';
			}

		}

		// create empty arrays to fill that match database objects
		$formattedSales = [];
		$formattedOverrides = [];
		$formattedExpenses = [];

		$payrollTotal = (
			collect($sales)->pluck('amount')->sum() +
			collect($overrides)->pluck('total')->sum() +
			collect($expenses)->pluck('amount')->sum()
		);

		foreach($sales as $s)
		{
			$formattedSales[] = [
				'vendor' => $vendorId,
				'sale_date' => Carbon::createFromFormat('m-d-Y', $s['date']),
				'first_name' => $s['name']['first'],
				'last_name' => $s['name']['last'],
				'address' => $s['address'],
				'city' => $s['city'],
				'status' => $s['status'],
				'amount' => $s['amount'],
				'agentid' => $employeeId,
				'issue_date' => $date,
				'wkending' => $endDate
			];
		}

		$hasSales = (count($sales) > 0);

		foreach($overrides as $o)
		{
			$formattedOverrides[] = [
				'vendor_id' => $vendorId,
				'name' => $o['name'],
				'sales' => $o['numOfSales'],
				'commission' => $o['commission'],
				'total' => $o['total'],
				'agentid' => $employeeId,
				'issue_date' => $date,
				'wkending' => $endDate
			];
		}

		foreach($expenses as $e)
		{
			$formattedExpenses[] = [
				'vendor_id' => $vendorId,
				'type' => $e['type'],
				'amount' => $e['amount'],
				'notes' => $e['notes'],
				'agentid' => $employeeId,
				'issue_date' => $date,
				'wkending' => $endDate
			];
		}

		DB::beginTransaction();

		try{
			if($hasSales){
				foreach($formattedSales as $s)
				{
					Invoice::create([
						'vendor' => $s['vendor'],
						'sale_date' => $s['sale_date'],
						'first_name' => $s['first_name'],
						'last_name' => $s['last_name'],
						'address' => $s['address'],
						'city' => $s['city'],
						'status' => $s['status'],
						'amount' => $s['amount'],
						'agentid' => $s['agentid'],
						'issue_date' => $s['issue_date'],
						'wkending' => $s['wkending']
					]);
				}
			}

			if($hasOverrides){
				foreach($formattedOverrides as $o)
				{
					Override::create([
						'vendor_id' => $o['vendor_id'],
						'name' => $o['name'],
						'sales' => $o['sales'],
						'commission' => $o['commission'],
						'total' => $o['total'],
						'agentid' => $o['agentid'],
						'issue_date' => $o['issue_date'],
						'wkending' => $o['wkending']
					]);
				}
			}

			if($hasExpenses){
				foreach($formattedExpenses as $e)
				{
					Expense::create([
						'vendor_id' => $e['vendor_id'],
						'type' => $e['type'],
						'amount' => $e['amount'],
						'notes' => $e['notes'],
						'agentid' => $e['agentid'],
						'issue_date' => $e['issue_date'],
						'wkending' => $e['wkending']
					]);
				}
			}

			Payroll::create([
				'agent_id' => $employeeId,
				'agent_name' => Employee::agentId($employeeId)->first()->name,
				'amount' => $payrollTotal,
				'is_paid' => 0,
				'vendor_id' => $vendorId,
				'pay_date' => $date
			]);

			DB::commit();
		} catch (\mysqli_sql_exception $e) {

			DB::rollback();

			$result['status'] = false;
			$result['message'] = 'A SQL error has occurred, please try again. If the problem persists, please email your development team.';
		}

		$result['status'] = true;
		$result['message'] = 'Your invoice information has been successfully stored and processed.';

		return $result;
	}


	public function saveInvoice($input)
	{
		$result = [];
		$hasExpenses = $input['hasExpenses'];
		$hasOverrides = $input['hasOverrides'];
		$sales = (isset($input['individual'])) ? $input['individual'] : [];
		$vendorId = $input['vendorId'];
		$employeeId = $input['employeeId'];
		$date = $input['date'];
		$endDate = $input['endDate'];
		$overrides = ($hasOverrides === 'true') ? $input['overrides'] : [];
		$expenses = ($hasExpenses === 'true') ? $input['expenses'] : [];

		$existingInvoice = $this->invoiceHelper->checkForExistingInvoice($employeeId, $vendorId, $date);
		if($existingInvoice === true)
		{
			$result['status'] = false;
			$result['message'] = 'An existing invoice has already been created for this employee, matching this date and vendor codes.';
		}

		// create empty arrays to fill that match database objects
		$formattedSales = [];
		$formattedOverrides = [];
		$formattedExpenses = [];

		$salesColl = collect($sales);
		$overColl = collect($overrides);
		$expColl = collect($expenses);

		$salesAmt = 0;
		$overAmt = 0;
		$expAmt = 0;
		if(is_numeric($salesColl->pluck('amount')->sum())) {
			$salesAmt = $salesAmt + $salesColl->pluck('amount')->sum();
		}
		if(is_numeric($overColl->pluck('total')->sum())) {
			$overAmt = $overAmt + $overColl->pluck('total')->sum();
		}
		if(is_numeric($expColl->pluck('amount')->sum())) {
			$expAmt = $expAmt + $expColl->pluck('amount')->sum();
		}

		$payrollTotal = $salesAmt + $overAmt + $expAmt;


		if(sizeof($sales) == 0){
			$formattedSales[] = [
				'vendor' => $vendorId,
				'sale_date' => new Carbon($date),
				'first_name' => '-------',
				'last_name' => '---------',
				'address' => '-----',
				'city' => '-----',
				'status' => '-----',
				'amount' => 0,
				'agentid' => $employeeId,
				'issue_date' => $date,
				'wkending' => $endDate
			];
		} else {

			foreach($sales as $s)
			{
				$formattedSales[] = [
					'vendor' => $vendorId,
					'sale_date' => new Carbon($s['date']),
					'first_name' => $s['name']['first'],
					'last_name' => $s['name']['last'],
					'address' => $s['address'],
					'city' => $s['city'],
					'status' => $s['status'],
					'amount' => (is_numeric($s['amount'])) ? $s['amount'] : 0,
					'agentid' => $employeeId,
					'issue_date' => $date,
					'wkending' => $endDate
				];
			}

		}

		$hasSales = (sizeof($formattedSales) > 0);

		foreach($overrides as $o)
		{
			$formattedOverrides[] = [
				'vendor_id' => $vendorId,
				'name' => $o['name'],
				'sales' => $o['numOfSales'],
				'commission' => $o['commission'],
				'total' => $o['total'],
				'agentid' => $employeeId,
				'issue_date' => $date,
				'wkending' => $endDate
			];
		}

		foreach($expenses as $e)
		{
			$formattedExpenses[] = [
				'vendor_id' => $vendorId,
				'type' => $e['type'],
				'amount' => $e['amount'],
				'notes' => $e['notes'],
				'agentid' => $employeeId,
				'issue_date' => $date,
				'wkending' => $endDate
			];
		}

		DB::beginTransaction();

		try{
			if($hasSales){
				foreach($formattedSales as $s)
				{
					Invoice::create([
						'vendor' => $s['vendor'],
						'sale_date' => $s['sale_date'],
						'first_name' => $s['first_name'],
						'last_name' => $s['last_name'],
						'address' => $s['address'],
						'city' => $s['city'],
						'status' => $s['status'],
						'amount' => $s['amount'],
						'agentid' => $s['agentid'],
						'issue_date' => $s['issue_date'],
						'wkending' => $s['wkending']
					]);
				}
			}

			if($hasOverrides){
				foreach($formattedOverrides as $o)
				{
					Override::create([
						'vendor_id' => $o['vendor_id'],
						'name' => $o['name'],
						'sales' => $o['sales'],
						'commission' => $o['commission'],
						'total' => $o['total'],
						'agentid' => $o['agentid'],
						'issue_date' => $o['issue_date'],
						'wkending' => $o['wkending']
					]);
				}
			}

			if($hasExpenses){
				foreach($formattedExpenses as $e)
				{
					Expense::create([
						'vendor_id' => $e['vendor_id'],
						'type' => $e['type'],
						'amount' => $e['amount'],
						'notes' => $e['notes'],
						'agentid' => $e['agentid'],
						'issue_date' => $e['issue_date'],
						'wkending' => $e['wkending']
					]);
				}
			}

			Payroll::create([
				'agent_id' => $employeeId,
				'agent_name' => Employee::agentId($employeeId)->first()->name,
				'amount' => $payrollTotal,
				'is_paid' => 0,
				'vendor_id' => $vendorId,
				'pay_date' => $date
			]);

			DB::commit();
		} catch (\mysqli_sql_exception $e) {

			DB::rollback();

			$result['status'] = false;
			$result['message'] = 'A SQL error has occurred, please try again. If the problem persists, please email your development team.';
		}

		if(sizeof($result) < 1)
		{
			$result['status'] = true;
			$result['message'] = 'Your invoice information has been successfully stored and processed.';
		}

		return $result;
	}

}