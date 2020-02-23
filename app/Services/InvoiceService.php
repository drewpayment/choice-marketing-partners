<?php
/**
 * Created by PhpStorm.
 * User: drewpayment
 * Date: 9/28/17
 * Time: 12:32 AM
 */

namespace App\Services;


use App\Vendor;
use App\Expense;
use App\Invoice;
use App\Payroll;
use App\Employee;
use App\Override;
use Carbon\Carbon;
use App\Helpers\InvoiceHelper;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;

class InvoiceService {

	protected $invoiceHelper;
	protected $paystubService;

	/**
	 * InvoiceService constructor. Used to inject helpers.
	 *
	 * @param InvoiceHelper $invoice_helper
	 */
	public function __construct(InvoiceHelper $invoice_helper, PaystubService $paystub_service)
	{
		$this->invoiceHelper = $invoice_helper;
		$this->paystubService = $paystub_service;
	}

	/**
	 * Edit exist invoice.
	 *
	 * @param $input
	 *
	 * @return array
	 * @throws \Illuminate\Support\Facades\Exception
	 */
	public function editInvoice($input)
	{
		$result = [];
		$hasExpenses = $input['hasExpenses'];
		$hasOverrides = $input['hasOverrides'];
		$sales = isset($input['individual']) ? $input['individual'] : [];
		$vendorId = $input['vendorId'];
		$employeeId = $input['employeeId'];
		$date = $input['date'];
		$endDate = $input['endDate'];
		$overrides = $hasOverrides ? $input['overrides'] : [];
		$expenses = $hasExpenses ? $input['expenses'] : [];

		$existingInvoice = $this->invoiceHelper->checkForExistingInvoice($employeeId, $vendorId, $date);
		if($existingInvoice) {

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

		if(sizeof($sales) == 0) 
		{
			$formattedSales[] = new Invoice([
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
			]);
		}
		else 
		{
			foreach($sales as $s)
			{
				$formattedSales[] = new Invoice([
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
				]);
			}
		}

		$hasSales = (count($sales) > 0);

		foreach($overrides as $o)
		{
			$formattedOverrides[] = new Override([
				'vendor_id' => $vendorId,
				'name' => $o['name'],
				'sales' => $o['numOfSales'],
				'commission' => $o['commission'],
				'total' => $o['total'],
				'agentid' => $employeeId,
				'issue_date' => $date,
				'wkending' => $endDate
			]);
		}

		foreach($expenses as $e)
		{
			$formattedExpenses[] = new Expense([
				'vendor_id' => $vendorId,
				'type' => $e['type'],
				'amount' => $e['amount'],
				'notes' => $e['notes'],
				'agentid' => $employeeId,
				'issue_date' => $date,
				'wkending' => $endDate
			]);
		}

		DB::beginTransaction();

		try{
			$emp = Employee::agentId($employeeId)->first();
			if(sizeof($formattedSales) > 0) $emp->invoices()->saveMany($formattedSales);
			if(sizeof($formattedOverrides) > 0) $emp->overrides()->saveMany($formattedOverrides);
			if(sizeof($formattedExpenses) > 0) $emp->expenses()->saveMany($formattedExpenses);

			Payroll::create([
				'agent_id' => $employeeId,
				'agent_name' => $emp->name,
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

		if($result['status'] && !is_null($date))
		{
			$this->paystubService->processPaystubJob($date);
		}

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
		$overrides = $hasOverrides ? $input['overrides'] : [];
		$expenses = $hasExpenses ? $input['expenses'] : [];

		$existingInvoice = $this->invoiceHelper->checkForExistingInvoice($employeeId, $vendorId, $date);
		if($existingInvoice)
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
			$formattedSales[] = new Invoice([
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
			]);
		} else {

			foreach($sales as $s)
			{
				$formattedSales[] = new Invoice([
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
				]);
			}

		}

		$hasSales = (sizeof($formattedSales) > 0);

		foreach($overrides as $o)
		{
			$formattedOverrides[] = new Override([
				'vendor_id' => $vendorId,
				'name' => $o['name'],
				'sales' => $o['numOfSales'],
				'commission' => $o['commission'],
				'total' => $o['total'],
				'agentid' => $employeeId,
				'issue_date' => $date,
				'wkending' => $endDate
			]);
		}

		foreach($expenses as $e)
		{
			$formattedExpenses[] = new Expense([
				'vendor_id' => $vendorId,
				'type' => $e['type'],
				'amount' => $e['amount'],
				'notes' => $e['notes'],
				'agentid' => $employeeId,
				'issue_date' => $date,
				'wkending' => $endDate
			]);
		}

		DB::beginTransaction();

		try{
			$emp = Employee::agentId($employeeId)->first();

			if($hasSales) $emp->invoices()->saveMany($formattedSales);
			if($hasOverrides) $emp->overrides()->saveMany($formattedOverrides);
			if($hasExpenses) $emp->expenses()->saveMany($formattedExpenses);

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

		if($result['status'] && !is_null($date))
		{
			$this->paystubService->processPaystubJob($date);
		}

		return $result;
    }
    
    /**
     * Gets paystubs view associated with /paystubs/pdf-detail in web.php
     *
     * @param int $agentId
     * @param int $vendorId
     * @param Carbon $date
     * @return View
     */
    public function getPaystubView($agentId, $vendorId, $date)
    {
        $gross = 0;
        $invoiceDt = $date->format('m-d-Y');
        $issueDate = $date->format('Y-m-d');
		$stubs = Invoice::agentId($agentId)->vendorId($vendorId)->issueDate($date->format('Y-m-d'))->get();
		$emp = Employee::find($agentId);
        $vendorName = Vendor::find($vendorId)->name;
        
        /**
         * At this point, the user MUST have at least one paystub... if they don't, this means that someone deleted 
         * the one record they did have and it needs to be recreated for the pages to work properly. 
         */
        if (count($stubs) < 1 || is_null($stubs)) 
        {
            $this->insertBlankStub($agentId, $vendorId, $date);
        }

		foreach($stubs as $s)
		{
			if(is_numeric($s->amount))
			{
				$gross = $gross + $s->amount;
			}

			$s->sale_date = strtotime($s->sale_date);
			$s->sale_date = date('m-d-Y', $s->sale_date);
        }

		$overrides = Override::agentId($agentId)->vendorId($vendorId)->issueDate($issueDate)->get();
        $expenses = Expense::agentId($agentId)->vendorId($vendorId)->issueDate($issueDate)->get();

		$ovrGross = $overrides->sum(function($ovr){
			global $ovrGross;
			return $ovrGross + floatval($ovr->total);
		});

		$expGross = $expenses->sum(function($exp){
			global $expGross;
			return $expGross + floatval($exp->amount);
		});

		$gross = array_sum([$gross, $ovrGross, $expGross]);

		$loggedUser = Employee::find(Auth::user()->id);
		$isAdmin = ($loggedUser->is_admin == 1);

		return view('pdf.paystub', [
			'stubs' => $stubs,
			'emp' => $emp,
			'gross' => $gross,
			'invoiceDt' => $invoiceDt,
			'vendor' => $vendorName,
			'overrides' => $overrides,
			'expenses' => $expenses,
			'ovrgross' => $ovrGross,
			'expgross' => $expGross,
			'vendorId' => $vendorId,
			'isAdmin' => $isAdmin
		]);
    }

    public function insertBlankStub($agentId, $vendorId, $date)
    {
        $dt = Carbon::createFromFormat('Y-m-d', $date);
        $blankInvoice = new Invoice([
            'vendor' => $vendorId,
            'sale_date' => $date,
            'first_name' => '-------',
            'last_name' => '---------', 
            'address' => '-----', 
            'city' => '-----',
            'status' => '-----', 
            'amount' => 0,
            'agentid' => $agentId,
            'issue_date' => $date,
            'wkending' => $dt->subDays(11)->format('Y-m-d')
        ]);

        $blankInvoice->save();
    }

}