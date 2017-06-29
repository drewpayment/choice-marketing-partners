<?php

namespace App\Http\Controllers;

use App\Employee;
use App\Expense;
use App\Helpers\InvoiceHelper;
use App\Invoice;
use App\Override;
use App\Permission;
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
use niklasravnsborg\LaravelPdf\Facades\Pdf;

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


	public function HandleEditExistingInvoice(Request $request)
	{
		$salesInput = $request->sales;
		$overrideInput = $request->overrides;
		$expenseInput = $request->expenses;
		$payrollData = $request->payrollData;
		$salesArr = [];
		$overArr = [];
		$expArr = [];
		$exception = null;
		$payDetail = [];

		if(!is_null($salesInput))
		{
			$payDetail['id'] = $salesInput[0]['agentid'];
			$payDetail['payDate'] = $salesInput[0]['issueDate'];

			foreach($salesInput as $invoice)
			{
				if(!empty($invoice['issueDate']))
				{
					$salesArr[] = [
						'id' => $invoice['id'],
						'vendor' => $invoice['vendor'],
						'sale_date' => DateTime::createFromFormat('m-d-Y', $invoice['date']),
						'first_name' => $invoice['name']['first'],
						'last_name' => $invoice['name']['last'],
						'address' => $invoice['address'],
						'city' => $invoice['city'],
						'status' => $invoice['status'],
						'amount' => $invoice['amount'],
						'agentid' => $invoice['agentid'],
						'issue_date' => new DateTime($invoice['issueDate']),
						'wkending' => DateTime::createFromFormat('m-d-Y', $invoice['wkending']),
						'created_at' => new DateTime(),
						'updated_at' => new DateTime()
					];
				}
			}
		}


		if(!is_null($overrideInput))
		{
			$payDetail['id'] = (!is_null($payDetail['id'])) ? $overrideInput[0]['agentid'] : $payDetail['id'];
			$payDetail['payDate'] = (!is_null($overrideInput[0]['issueDate'])) ? $overrideInput[0]['issueDate'] : $payDetail['payDate'];

			foreach($overrideInput as $ovr)
			{
				if(!empty($ovr['issueDate']))
				{
					$overArr[] = [
						'id' => $ovr['id'],
						'name' => $ovr['name'],
						'sales' => $ovr['numOfSales'],
						'commission' => $ovr['commission'],
						'total' => $ovr['total'],
						'agentid' => $ovr['agentid'],
						'issue_date' => new DateTime($ovr['issueDate']),
						'wkending' => DateTime::createFromFormat('m-d-Y', $ovr['wkending']),
						'created_at' => new DateTime(),
						'updated_at' => new DateTime()
					];
				}
			}
		}


		if(!is_null($expenseInput))
		{
			$payDetail['id'] = (!is_null($payDetail['id'])) ? $expenseInput[0]['agentid'] : $payDetail['id'];
			$payDetail['payDate'] = (!is_null($expenseInput[0]['issueDate'])) ? $expenseInput[0]['issueDate'] : $payDetail['payDate'];

			foreach($expenseInput as $exp)
			{
				if(!empty($exp['issueDate']))
				{
					$expArr[] = [
						'type' => $exp['type'],
						'amount' => $exp['amount'],
						'notes' => $exp['notes'],
						'agentid' => $exp['agentid'],
						'issue_date' => new DateTime($exp['issueDate']),
						'wkending' => DateTime::createFromFormat('m-d-Y', $exp['wkending']),
						'created_at' => new DateTime(),
						'updated_at' => new DateTime()
					];
				}
			}
		}

		$payDetailData = $this->invoiceHelper->setPayrollData($salesArr, $overArr, $expArr, $payrollData['agentID']);

		$dbHelper = new DbHelper;
		DB::beginTransaction();
		try {
			$dbHelper->RemoveCurrentSalesData($payrollData);
			$dbHelper->InsertSalesArray($salesArr);
			$dbHelper->InsertOverridesArray($overArr);
			$dbHelper->InsertExpensesArray($expArr);
			$dbHelper->RemoveCurrentPayDetailData($payrollData);
			$dbHelper->InsertPayDetailData($payDetailData);
			DB::commit();
		} catch(\Exception $e) {
			DB::rollback();

			return response()->json([false, $e]);
		}

		return response()->json(true);
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
		}
		catch(Exception $e)
		{
			return response()->json(false);
		}

		$agentid = ($salesInput[0]['agentid'] > 0) ? $salesInput[0]['agentid'] : $overrideInput[0]['agentid'];
		$result = is_null($exception) ? true : $exception;

		$payrollData[] = $this->invoiceHelper->setPayrollData($salesArr, $overArr, $expArr, $agentid);

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
		$vID = Vendor::find(1)->id; // palmco

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
		$overrides = Override::agentId($agentID)->issueDate($issueDate)->get();
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
		$issueDate = $invoiceDate->format('F jS, Y');
		$weekEnding = $weekEnding->format('m-d-Y');
		$invoiceDate = $invoiceDate->format('Y-m-d');

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
			 'weekEnding' => $weekEnding,
			 'invoiceDate' => $invoiceDate]);
	}


	/*
	 * new paystubs module to support paystub searching and returning all employees
	 *
	 */
	public function paystubs()
	{
		$thisUser = Auth::user()->employee->first();
		$admin = $thisUser->is_admin;

		$isAdmin = ($admin == 1);
		$vendor = -1;
		$date = Invoice::latest('issue_date')->first()->issue_date;

		$issueDates = Invoice::latest('issue_date')->withActiveAgent()
						->get()->unique('issue_date')->pluck('issue_date');


		if($isAdmin){
			$agents = Employee::active()->hideFromPayroll()->orderByName()->get();
			$paystubs = Invoice::vendorId($vendor)
							->issueDate($date)
							->agentId($agents->pluck('id')->toArray())
							->latest('issue_date')
							->latest('agentid')
							->withActiveAgent()
							->get()
							->unique('agentid', 'issue_date');

		} else {
			$list = $thisUser->permissions()->active()->get();

			// not admin, but has agents roll to them
			if(count($list) > 0){
				$empsResult = Employee::agentId($list->pluck('emp_id')->all())->get();
				$empsResult[] = $thisUser;
				$agents = collect($empsResult);

				$paystubs = Invoice::vendorId($vendor)
				                   ->issueDate($date)
				                   ->agentId($agents->pluck('id')->all())
				                   ->latest('issue_date')
				                   ->latest('agentid')
				                   ->withActiveAgent()
				                   ->get()
				                   ->unique('agentid', 'issue_date');

			} else { // agent w/no roll up employees
				$paystubs = Invoice::vendorId($vendor)
				                   ->issueDate($date)
				                   ->agentId($thisUser->id)
				                   ->latest('issue_date')
				                   ->withActiveAgent()
				                   ->get()
				                   ->unique('agentid', 'issue_date');

				$agents = Auth::user()->employee;
			}
		}


		$issueDates = collect($issueDates);
		$paystubs = collect($paystubs);
		$agents = collect($agents);
		$emps = Employee::active()->get();
		$vendors = Vendor::active()->get();

		return view('paystubs.paystubs',
			['isAdmin' => $isAdmin,
			 'emps' => $emps,
			 'paystubs' => $paystubs,
			 'agents' => $agents,
			 'issueDates' => $issueDates,
			 'vendors' => $vendors]);
	}


	public function filterPaystubs(Request $request)
	{
		if(!$request->ajax()) return response()->json(false);

		$params = Input::all()['inputParams'];
		$results = $this->invoiceHelper->searchPaystubData($params);

		return view('paystubs._stubrowdata', [
			'paystubs' => $results->stubs,
			'agents' => $results->agents,
			'vendors' => $results->vendors
		]);
	}


	public function generatePdfPaystub(Request $request)
	{
		if(!$request->ajax()) return response()->json(false);

		$inputParams = Input::all()['inputParams'];
		$agentId = $inputParams->agentid;
		$date = new Carbon($inputParams->date);
		$gross = 0;
		$invoiceDt = $date->format('m-d-Y');
		$stubs = Invoice::agentId($agentId)->issueDate($date->format('Y-m-d'))->get();
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


		$pdf = PDF::loadView('pdf.paystub', [
			'stubs' => $stubs,
			'emp' => $emp,
			'gross' => $gross,
			'invoiceDt' => $invoiceDt,
			'vendor' => $vendorName,
			'overrides' => $overrides,
			'expenses' => $expenses,
			'ovrgross' => $ovrGross,
			'expgross' => $expGross
		]);

		return $pdf;
	}


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
