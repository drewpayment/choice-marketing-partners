<?php

namespace App\Http\Controllers;

use App\Employee;
use App\Expense;
use App\Helpers\InvoiceHelper;
use App\Invoice;
use App\Override;
use App\Payroll;
use App\Services\DbHelper;
use App\Vendor;
use Carbon\Carbon;
use DateTime;
use Doctrine\DBAL\Driver\Mysqli\MysqliException;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Exception;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Input;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\View;
use Meneses\LaravelMpdf\Facades\LaravelMpdf;
use mPDF;

class InvoiceController extends Controller
{

    protected $dbHelper;
    protected $invoiceHelper;

	/**
	 * Middleware and helpers wiring
	 */
	public function __construct(InvoiceHelper $_invoiceHelper)
	{
		$this->middleware('auth');
		$this->invoiceHelper = $_invoiceHelper;
	}


	public function index()
	{
		$emps = Employee::active()->hideFromPayroll()->orderByName()->get();
		$vendors = Vendor::all();
		$wedArr = [];

		for($i = 0; $i < 3; $i++){
			$dt = Carbon::parse('this wednesday');
			$tmpDt = $dt->addWeek($i);
			$wedArr[] = $tmpDt->format('m-d-Y');
		}


		return view('invoices.upload', ['emps' => $emps, 'weds' => $wedArr, 'vendors' => $vendors]);
	}


	public function HandleEditInvoice(Request $request)
	{
		if(!$request->ajax())
		{
			return response()->json(false);
		}

		$input = Input::all();
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

				return response()->json([
					'status' => false,
					'message' => 'A SQL error has occurred, please try again. If the problem persists, please email your development team.'
				]);
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

			return response()->json([
				'status' => false,
				'message' => 'A SQL error has occurred, please try again. If the problem persists, please email your development team.'
			]);
		}


		return response()->json([
			'status' => true,
			'message' => 'Your invoice information has been successfully stored and processed.'
		]);
	}


	/**
	 * Save invoice via ajax --- new module
	 *
	 */
	public function SaveInvoice(Request $request)
	{
		if(!$request->ajax())
		{
			return response()->json(false);
		}

		$input = Input::all();
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
		if($existingInvoice === true) return response()->json([
			'status' => false,
			'message' => 'An existing invoice has already been created for this employee, matching this date and vendor codes.'
		]);

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

			return response()->json([
				'status' => false,
				'message' => 'A SQL error has occurred, please try again. If the problem persists, please email your development team.'
			]);
		}


		return response()->json([
			'status' => true,
			'message' => 'Your invoice information has been successfully stored and processed.'
		]);
	}


	/**
	 * Upload invoice from handsontable
	 */
	public function UploadInvoice(Request $request)
	{
		$salesInput = $request->sales;
		$overrideInput = $request->overrides;
		$expenseInput = $request->expenses;
		$salesArr = [];
		$overArr = [];
		$expArr = [];
		$exception = null;
		$payrollData = [];

		$vendorId = $salesInput[0]['vendor'];

		$hasExistingInvoice = $this->invoiceHelper->checkForExistingInvoice($salesInput[0]['agentid'], $salesInput[0]['vendor'], $salesInput[0]['issueDate']);

		if($hasExistingInvoice === true) return response()->json(false);

		if(!is_null($salesInput))
		{
			foreach($salesInput as $invoice)
			{
				if(!empty($invoice['issueDate']))
				{
					$salesArr[] = [
						'id' => $invoice['id'],
						'vendor' => $invoice['vendor'],
						'sale_date' => new DateTime($invoice['date']),
						'first_name' => $invoice['name']['first'],
						'last_name' => $invoice['name']['last'],
						'address' => $invoice['address'],
						'city' => $invoice['city'],
						'status' => $invoice['status'],
						'amount' => $invoice['amount'],
						'agentid' => $invoice['agentid'],
						'issue_date' => new DateTime($invoice['issueDate']),
						'wkending' => new DateTime($invoice['wkending']),
						'created_at' => new DateTime(),
						'updated_at' => new DateTime()
					];
				}
			}
		}


		if(!is_null($overrideInput))
		{
			foreach($overrideInput as $ovr)
			{
				if(!empty($ovr['issueDate']))
				{
					$overArr[] = [
						'id' => $ovr['id'],
						'vendor_id' => $vendorId,
						'name' => $ovr['name'],
						'sales' => $ovr['numOfSales'],
						'commission' => $ovr['commission'],
						'total' => $ovr['total'],
						'agentid' => $ovr['agentid'],
						'issue_date' => new DateTime($ovr['issueDate']),
						'wkending' => new DateTime($ovr['wkending']),
						'created_at' => new DateTime(),
						'updated_at' => new DateTime()
					];
				}
			}
		}


		if(!is_null($expenseInput))
		{
			foreach($expenseInput as $exp)
			{
				if(!empty($exp['issueDate']))
				{
					$expArr[] = [
						'vendor_id' => $vendorId,
						'type' => $exp['type'],
						'amount' => $exp['amount'],
						'notes' => $exp['notes'],
						'agentid' => $exp['agentid'],
						'issue_date' => new DateTime($exp['issueDate']),
						'wkending' => new DateTime($exp['wkending']),
						'created_at' => new DateTime(),
						'updated_at' => new DateTime()
					];
				}
			}
		}

		DB::beginTransaction();
		try{
			if(!is_null($salesArr))
			{
				DB::table('invoices')->insert($salesArr);
			}
			if(!is_null($overArr))
			{
				DB::table('overrides')->insert($overArr);
			}
			if(!is_null($expArr))
			{
				DB::table('expenses')->insert($expArr);
			}

			DB::commit();
		}
		catch(Exception $e)
		{
			DB::rollback();
			return response()->json(false);
		}

		$agentid = ($salesInput[0]['agentid'] > 0) ? $salesInput[0]['agentid'] : $overrideInput[0]['agentid'];
		$result = is_null($exception) ? true : $exception;

		$payrollData[] = $this->invoiceHelper->setPayrollData($salesArr, $overArr, $expArr, $agentid, $vendorId);

		DB::beginTransaction();
		try{
			DB::table('payroll')->insert($payrollData);
			DB::commit();
		}
		catch(Exception $e)
		{
			DB::rollback();
			return response()->json(false);
		}

		return response()->json($result);
	}


	public function deletePaystub(Request $request)
	{
		$params = $request->all();
		$id = $params["id"];
		$date = $params["date"];
		$date = date_create_from_format('m-d-Y', $date);
		$date = $date->format('Y-m-d');

		DB::beginTransaction();
		try{
			Invoice::agentId($id)->issueDate($date)->delete();
			Expense::agentId($id)->issueDate($date)->delete();
			Override::agentId($id)->issueDate($date)->delete();

			DB::commit();
			$result = true;
		} catch (MysqliException $e)
		{
			DB::rollback();
			$result = false;
		}

		return response()->json($result);
	}


	public function historical()
	{
		$thisUser = Employee::find(Auth::user()->id);

		$result = $this->invoiceHelper->getPaystubEmployeeListByLoggedInUser($thisUser);
		$admin = $thisUser->is_admin;

		$hidden = ($admin == 1) ? "" : "hidden";
		$isAdmin = ($admin == 1);

		return view('invoices.historical',
			['emps' => $result, 'self' => $thisUser, 'hidden' => $hidden, 'isAdmin' => $isAdmin]);
	}



	public function returnIssueDates(Request $request)
	{
		$thisUser = Employee::find(Auth::user()->id);
		$admin = ($thisUser->is_admin == 1);
		$id = $request->id;
		$dates = [];
		$list = Invoice::agentId($id)->latest('issue_date')->get()->unique('issue_date');

		foreach($list as $dt)
		{
			$date = $dt->issue_date;
			$today = strtotime('today');
			$nextMon = strtotime('next wednesday 20:00 -1 day');
			$issueDt = strtotime($date);

			if($admin){
				$dates[] = date('m-d-Y', strtotime($date));
			} else {
				if($issueDt > $today){
					if($today > $nextMon){
						$dates[] = date('m-d-Y', strtotime($date));
					} else {
						continue;
					}
				} else {
					$dates[] = date('m-d-Y', strtotime($date));
				}
			}

		}

		return view('invoices.issuedates', ['issuedates' => $dates]);
	}


	public function returnPaystub(Request $request)
	{
		$agentId = $request->id;
		$date = $request["date"];
		$date = date_create_from_format('m-d-Y', $date);
		$date = $date->format('Y-m-d');
		$gross = 0;
		$invoiceDt = strtotime($date);
		$invoiceDt = date('m-d-Y', $invoiceDt);
		$stubs = Invoice::agentId($agentId)->issueDate($date)->get();
		$emp = Employee::find($agentId);
		$vendorId = $stubs->first()->vendor;
		$vendorName = Vendor::find($vendorId)->name;

		foreach($stubs as $s)
		{
			if(is_numeric($s->amount))
			{
				$gross = $gross + $s->amount;
			}

			$s->sale_date = strtotime($s->sale_date);
			$s->sale_date = date('m-d-Y', $s->sale_date);
		}

		$overrides = Override::agentId($agentId)->issueDate($date)->get();
		$expenses = Expense::agentId($agentId)->issueDate($date)->get();

		$ovrGross = $overrides->sum(function($ovr){
			global $ovrGross;
			return $ovrGross + $ovr->total;
		});

		$expGross = $expenses->sum(function($exp){
			global $expGross;
			return $expGross + $exp->amount;
		});

		$gross = array_sum([$gross, $ovrGross, $expGross]);


		return view('invoices.paystub',
			['stubs' => $stubs,
			 'emp' => $emp,
			 'gross' => $gross,
			 'invoiceDt' => $invoiceDt,
			 'vendor' => $vendorName,
			 'overrides' => $overrides,
			 'expenses' => $expenses,
			 'ovrgross' => $ovrGross,
			 'expgross' => $expGross]);
	}


	public function OverridesModal()
	{
		return view('invoices.overridesmodal');
	}


	public function searchInvoices()
	{
		$emps = Employee::active()->orderByName()->get();
		$campaigns = Vendor::all()->sortBy('id');
		$vID = Vendor::find(1)->id;

		$dates = Invoice::vendorId($vID)->get(['issue_date'])->unique()->values()->all();
		$dates = collect($dates)->sortByDesc('issue_date');
		$invoiceList = Invoice::all()->groupBy('issue_date')->all();

		$invoices = [];
		$count = 0;
		foreach($invoiceList as $i){
			$row = $i->first(function($v, $k){
				return $v->agentid;
			});
			$vendorId = $i->first(function($v, $k){
				return $v->vendor;
			})->vendor;
			$id = $i->first(function($v, $k){
				return $v->agentid;
			})->agentid;

			$name = $emps->first(function($v, $k) use ($row){
				return $v->id == $row->agentid;
			});
			$name = (!is_null($name)) ? $name->name : null;

			$c = $campaigns->first(function($v, $k) use ($vendorId){
				return $v->id == 1;
			});
			$campaign = $c->name;

			$invoices[] = [
				'name' => $name,
				'campaign' => $campaign,
				'issueDate' => $row->issue_date
			];
		}


		return view('invoices.search',
			['employees' => $emps,
			 'campaigns' => $campaigns,
			 'dates' => $dates,
			 'invoices' => $invoices]);
	}


	public function getSearchResults(Request $request)
	{
		$inputParams = $request->inputParams;
		$vID = $inputParams['vendorid'];
		$aID = $inputParams['agentid'];
		$date = $inputParams['issue_date'];
		// find invoice by id and then return filled out handsontable
		$data = Invoice::vendorId($vID)->issueDate($date)->agentId($aID)->get();

		$employees = Employee::all();
		$vendors = Vendor::all();
		$result = [];

		foreach($data as $d)
		{
			$empName = $employees->first(function($v, $k) use ($d){
				return $v->id == $d->agentid;
			})->name;
			$vendor = $vendors->first(function($v, $k) use($d){
				return $v->id == $d->vendor;
			})->name;
			$result[] = [
				'agentID' => $d->agentid,
				'agentName' => $empName,
				'issueDate' => $d->issue_date,
				'vendorID' => $d->vendor,
				'vendorName' => $vendor
			];
		}
		$result = collect($result)->unique('issue_date')->all();

		return view('invoices._searchresults', ['invoices' => $result]);
	}


	public function editInvoice($agentID, $vendorID, $issueDate)
	{
		$invoices = Invoice::agentId($agentID)->vendorId($vendorID)->issueDate($issueDate)->get();
		$overrides = Override::agentId($agentID)->vendorId($vendorID)->issueDate($issueDate)->get();
		$expenses = Expense::agentId($agentID)->issueDate($issueDate)->get();
		$employee = Employee::find($invoices->first()->agentid);
		$campaign = Vendor::find($invoices->first()->vendor);

		$invoices = $invoices->transform(function($v, $k){
			$date = new DateTime($v->sale_date);
			$v->sale_date = $date->format('m-d-Y');
			return $v;
		});

		$invoiceDate = new DateTime($invoices->first()->issue_date);
		$weekEnding = new DateTime($invoices->first()->wkending);
		$issueDate = $invoiceDate->format('m-d-Y');
		$weekEnding = $weekEnding->format('m-d-Y');

		$invoices = json_encode($invoices);
		$overrides = json_encode($overrides);
		$expenses = json_encode($expenses);

		return view('invoices.edit',
			['invoices' => $invoices,
			 'employee' => $employee,
			 'campaign' => $campaign,
			 'overrides' => $overrides,
			 'expenses' => $expenses,
			 'issueDate' => $issueDate,
			 'weekEnding' => $weekEnding]);
	}


	function formatDateCollectionSeparators($date, $currentFormat, $desiredFormat)
	{
		return Carbon::createFromFormat($currentFormat, $date)->format($desiredFormat);
	}


	/*
	 * new paystubs module to support paystub searching and returning all employees
	 *
	 */
	public function paystubs()
	{
		$thisUser = Auth::user()->employee;
		$admin = $thisUser->is_admin;
		$isManager = ($thisUser->is_mgr == 1);

		$isAdmin = ($admin == 1);
		$vendor = -1;
		$date = Invoice::latest('issue_date')->first()->issue_date;

		$issueDates = Invoice::latest('issue_date')->withActiveAgent()
						->get()->unique('issue_date')->pluck('issue_date');

		$vendors = Vendor::active()->get();
		$vendorDictionary = Vendor::all();
		$vendorDictionary = collect($vendorDictionary);

		/**
		 * ADMIN USERS
		 */
		if($isAdmin){
			$agents = Employee::active()->hideFromPayroll()->orderByName()->get();
			$rows = Invoice::vendorId($vendor)
							->issueDate($date)
							->agentId($agents->pluck('id')->toArray())
							->latest('issue_date')
							->latest('agentid')
							->latest('vendor')
							->withActiveAgent()
							->get();

			$paystubs = $rows->unique(function($item){
				return $item['agentid'].$item['vendor'];
			});

			$overrides = Override::agentId($agents->pluck('id')->toArray())
                               ->issueDate($date)
                               ->get();
			$expenses = Expense::agentId($agents->pluck('id')->toArray())
			                   ->issueDate($date)
			                   ->get();

		}
		/**
		 * MANAGERS
		 */
		else if ($isManager)
		{
			$list = $thisUser->permissions()->active()->get();

			$empsResult = Employee::agentId($list->pluck('emp_id')->all())->get();
			$empsResult[] = $thisUser;
			$agents = collect($empsResult);

			$rows = Invoice::vendorId($vendor)
			               ->issueDate($date)
			               ->agentId($agents->pluck('id')->all())
			               ->latest('issue_date')
			               ->latest('agentid')
			               ->latest('vendor')
			               ->withActiveAgent()
			               ->get();
			$paystubs = $rows->unique(function($item){
				return $item['agentid'].$item['vendor'];
			});

			$overrides = Override::agentId($agents->pluck('id')->all())->issueDate($date)->get();
			$expenses = Expense::agentId($agents->pluck('id')->all())->issueDate($date)->get();
		}
		/**
		 * AGENTS
		 */
		else
		{
			$agents = collect(array(Auth::user()->employee));
			$issueDates = Invoice::latest('issue_date')->agentId($agents[0]['id'])
			                     ->get()->unique('issue_date')->pluck('issue_date');

			if(count($issueDates) > 0)
			{
				$today = Carbon::now()->tz('America/Detroit');
				$nextIssue = Carbon::createFromFormat('Y-m-d', $issueDates[0], 'America/Detroit');
				$release = $nextIssue->subDay()->setTime(20, 0, 0);

				if($today < $release)
				{
					$issueDates = $issueDates->slice(1);
					$date = (!isset($issueDates[0])) ? Carbon::createFromFormat('Y-m-d', $date)->previous(Carbon::WEDNESDAY)->toDateTimeString() : $issueDates[0];
				}
			}

			$rows = Invoice::vendorId($vendor)
			               ->issueDate($date)
			               ->agentId($thisUser->id)
			               ->latest('issue_date')
			               ->latest('vendor')
			               ->withActiveAgent()
			               ->get();

			$paystubs = $rows->unique(function($item){
				return $item['agentid'].$item['vendor'];
			});


			$overrides = Override::agentId($agents->pluck('id')->all())->issueDate($date)->get();
			$expenses = Expense::agentId($agents->pluck('id')->all())->issueDate($date)->get();

			$vendors = Invoice::latest('issue_date')->agentId($agents[0]['id'])->get()->unique('vendor');
			$vendors = collect($vendors);

			foreach($vendors as $v)
			{
				$name = $vendorDictionary->first(function($value, $k)use($v){
					return $v->vendor == $value->id;
				});
				$v['name'] = $name->name;
			}
		}

		$issueDates = collect($issueDates);
		$paystubs = collect($paystubs);
		$agents = collect($agents);
		$emps = Employee::active()->get();


		return view('paystubs.paystubs',
			['isAdmin' => $isAdmin,
			 'isManager' => $isManager,
			 'emps' => $emps,
			 'paystubs' => $paystubs,
			 'agents' => $agents,
			 'issueDates' => $issueDates,
			 'vendors' => $vendors,
			 'vendorDictionary' => $vendorDictionary,
			 'rows' => $rows,
			 'overrides' => $overrides,
			 'expenses' => $expenses]);
	}


	function array_insert($array, $var, $position)
	{
		$before = array_slice($array, 0, $position);
		$after = array_slice($array, $position);

		$return = array_merge($before, (array) $var);
		return array_merge($return, $after);
	}


	public function filterPaystubs(Request $request)
	{
		if(!$request->ajax()) return response()->json(false);

		$params = Input::all()['inputParams'];
		$results = $this->invoiceHelper->searchPaystubData($params);

		return view('paystubs._stubrowdata', [
			'paystubs' => $results->stubs,
			'agents' => $results->agents,
			'vendors' => $results->vendors,
			'rows' => $results->rows,
			'overrides' => $results->overrides,
			'expenses' => $results->expenses
		]);
	}


	public function showPaystub(Request $request)
	{

		$inputParams = $request->all();
		$agentId = $inputParams['agent'];
		$vendorId = $inputParams['vendor'];
		$date = new Carbon($inputParams['date']);
		$gross = 0;
		$invoiceDt = $date->format('m-d-Y');
		$stubs = Invoice::agentId($agentId)->vendorId($vendorId)->issueDate($date->format('Y-m-d'))->get();
		$emp = Employee::find($agentId);
		$vendorName = Vendor::find($vendorId)->name;

		foreach($stubs as $s)
		{
			if(is_numeric($s->amount))
			{
				$gross = $gross + $s->amount;
			}

			$s->sale_date = strtotime($s->sale_date);
			$s->sale_date = date('m-d-Y', $s->sale_date);
		}

		$overrides = Override::agentId($agentId)->vendorId($vendorId)->issueDate($date)->get();
		$expenses = Expense::agentId($agentId)->vendorId($vendorId)->issueDate($date)->get();

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


	public function printablePaystub(Request $request)
	{
		define('_MPDF_TEMP_PATH', public_path('assets/pdfs/temp'));
		define('_MPDF_TTFONTDATAPATH', public_path('assets/pdfs/temp'));
		$inputParams = $request->all();

		$agentId = $inputParams['agent'];
		$date = Carbon::createFromFormat('m-d-Y', $inputParams['date']);
		$sqlDate = $date->format('Y-m-d');
		$gross = 0;
		$invoiceDt = $date->format('m-d-Y');
		$stubs = Invoice::agentId($agentId)->issueDate($sqlDate)->get();
		$emp = Employee::find($agentId);
		$vendorId = $inputParams['vendor'];
		$vendorName = Vendor::find($vendorId)->name;

		foreach($stubs as $s)
		{
			if(is_numeric($s->amount))
			{
				$gross = $gross + $s->amount;
			}

			$s->sale_date = strtotime($s->sale_date);
			$s->sale_date = date('m-d-Y', $s->sale_date);
		}

		$overrides = Override::agentId($agentId)->issueDate($sqlDate)->get();
		$expenses = Expense::agentId($agentId)->issueDate($sqlDate)->get();

		$ovrGross = $overrides->sum(function($ovr){
			global $ovrGross;
			return $ovrGross + $ovr->total;
		});

		$expGross = $expenses->sum(function($exp){
			global $expGross;
			return $expGross + $exp->amount;
		});

		$gross = array_sum([$gross, $ovrGross, $expGross]);


		$path = strtolower($emp->name . '_' . $vendorName . '_' . $date->format('Ymd') . '.pdf');
		$view = View::make('pdf.template', [
			'stubs' => $stubs,
			'emp' => $emp,
			'gross' => $gross,
			'invoiceDt' => $invoiceDt,
			'vendor' => $vendorName,
			'overrides' => $overrides,
			'expenses' => $expenses,
			'ovrgross' => $ovrGross,
			'expgross' => $expGross,
			'vendorId' => $vendorId
		])->render();

		$pdf = LaravelMpdf::loadHTML('');
		$pdf->getMpdf()->WriteHTML($view);

		return response($pdf->stream($path));
	}


	public function makePdf(Request $request)
	{
		$url = urldecode($request->url);

		if(ini_get('allow_url_fopen'))
		{
			$html = file_get_contents($url);
		}
		else
		{
			$ch = curl_init($url);
			curl_setopt($ch, CURLOPT_HEADER, 0);
			curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
			$html = curl_exec($ch);
			curl_close($ch);
		}

		$mpdf = new mPdf();
		$mpdf->useSubstitutions = true;
		$mpdf->CSSselectMedia = 'mpdf';
		$mpdf->setBasePath($url);
		$mpdf->WriteHTML($html);

		$path = strtolower(str_replace(' ', '', Auth::user()->employee()->name)) . '_' . strtotime(Carbon::now());
		$stream = $mpdf->Output($path, 'I');

		return view('pdf.template', ['html' => $stream]);
	}


	public function deletePaystubPdf(Request $request)
	{
		if(!$request->ajax()){

			$msg = "Someone attempted to navigate to the delete PDF link without AJAX. Please inspect for attempted hacking.";

			Mail::to('drew.payment@choice-marketing-partners.com')
				->send($msg);

			return response()->json(false);
		}
		else
		{
			$pdf = Input::all()['pdf'];
			$sto = new Storage;
			$sto->delete('/public/pdfs/' . $pdf);
			return response()->json(true);
		}


	}


	/**
	 * HELPER FUNCTIONS
	 *
	 */


	private function unsetValue(array $array, $value)
	{
		foreach($array as $elementKey => $element){
			foreach($element as $eKey => $eVal){
				if($eKey == 'name' && $eVal == $value){
					unset($array[$elementKey]);
				}
			}
		}

		return $array;
	}

	private function findObjectById($id, $array)
	{
		foreach($array as $a)
		{
			if($id == $a->id)
			{
				return $a;
			}
		}
	}

	protected function findValueInObjectArrayByType($id, $array, $key)
	{
		foreach($array as $a)
		{
			if($id == $a[$key])
			{
				return true;
			}
		}

		return false;
	}

}
