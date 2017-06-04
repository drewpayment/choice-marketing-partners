<?php

namespace App\Http\Controllers;

use App\Helpers\InvoiceHelper;
use App\Services\DbHelper;
use Carbon\Carbon;
use DateTime;
use Doctrine\DBAL\Driver\Mysqli\MysqliException;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Exception;
use Illuminate\Http\Request;

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
		$noSalaryEmps = ['Chris Payment', 'Terri Payment', 'Drew Payment', 'Bret Payment'];
		$emps = DB::table('employees')->where('is_active', 1)->get();
		$emps = $emps->sortBy('name')->toArray();
		foreach($noSalaryEmps as $e){
			$emps = $this->unsetValue($emps, $e);
		}
		$emps = collect($emps);
		$vendors = DB::table('vendors')->get();
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

			echo $e;
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

		try{
			DB::table('invoices')->where([
				['agentid', '=', $id],
				['issue_date', '=', $date]
			])->delete();

			DB::table('expenses')->where([
				['agentid', '=', $id],
				['issue_date', '=', $date]
			])->delete();

			DB::table('overrides')->where([
				['agentid', '=', $id],
				['issue_date', '=', $date]
			])->delete();

			$result = true;
		} catch (MysqliException $e)
		{
			$result = false;
		}

		return response()->json($result);
	}


	public function historical()
	{
		$thisUser = DB::table('employees')->where('name', Auth::user()->name)->first();
		$admin = $thisUser->is_admin;
		$noSalaryEmps = DB::table('employees')->whereIn('name', ['Chris Payment', 'Terri Payment', 'Drew Payment', 'Bret Payment'])->get();
		if($admin == 1)
		{
			$result = DB::table('employees')->where('is_active', 1)->get();
			$result = $result->sortBy('name')->toArray();

			foreach($noSalaryEmps as $e){
				$result = $this->unsetValue($result, $e->name);
			}

			$result = collect($result);
		}
		else
		{
			$list = DB::table('permissions')->where('emp_id', $thisUser->id)->first();
			if(count($list) > 0){
				$list = explode('|', $list->roll_up);
				$emps = DB::table('employees')->get();
				$emps = $emps->sortBy('name');
				$result = [];
				foreach($list as $val)
				{
					array_push($result, $this->findObjectById($val, $emps));
				}
				$result = collect($result);
			} else {
				$result = [];
				$me = DB::table('employees')
						->where('id', $thisUser->id)->get();
				array_push($result, $this->findObjectById($thisUser->id, $me));
				$result = collect($result);
			}
		}
		$hidden = ($admin == 1) ? "" : "hidden";
		$isAdmin = ($admin == 1) ? true : false;

		return view('invoices.historical', ['emps' => $result, 'self' => $thisUser, 'hidden' => $hidden, 'isAdmin' => $isAdmin]);
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

		return false;
	}


	public function returnIssueDates(Request $request)
	{
		$thisUser = DB::table('employees')->where('name', Auth::user()->name)->first();
		$admin = ($thisUser->is_admin == 1) ? true : false;
		$id = $request->id;
		$dates = [];
		$list = DB::table('invoices')
						->select('issue_date')
						->where('agentid', '=', $id)
						->groupBy('issue_date')
						->orderBy('issue_date', 'desc')
						->get();

		foreach($list as $dt)
		{
			$today = strtotime('today');
			$nextMon = strtotime('next wednesday 20:00 -1 day');
			$issueDt = strtotime($dt->issue_date);

			if($admin){
				$dates[] = date('m-d-Y', strtotime($dt->issue_date));
			} else {
				if($issueDt > $today){
					if($today > $nextMon){
						$dates[] = date('m-d-Y', strtotime($dt->issue_date));
					} else {
						continue;
					}
				} else {
					$dates[] = date('m-d-Y', strtotime($dt->issue_date));
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
		$stubs = DB::table('invoices')
						->where([
							['issue_date', '=', $date],
							['agentid', '=', $agentId],
							['vendor', '=', 1]
						])->get();

		$emp = DB::table('employees')
						->select('*')
						->where('id', '=', $agentId)
						->first();

		$vendorId = $stubs->first()->vendor;
		$vendorName = DB::table('vendors')
						->select('name')
						->where('id', '=', $vendorId)
						->first();
		$vendorName = $vendorName->name;

		foreach($stubs as $s)
		{
			if(is_numeric($s->amount))
			{
				$gross = $gross + $s->amount;
			}

			$s->sale_date = strtotime($s->sale_date);
			$s->sale_date = date('m-d-Y', $s->sale_date);
		}

		$overrides = DB::table('overrides')
							->select('*')
							->where([
								['agentid', '=', $agentId],
								['issue_date', '=', $date]
							])->get();

		$expenses = DB::table('expenses')
							->select('*')
							->where('agentid', '=', $agentId)
							->where('issue_date', '=', $date)
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


		return view('invoices.paystub', ['stubs' => $stubs, 'emp' => $emp, 'gross' => $gross, 'invoiceDt' => $invoiceDt, 'vendor' => $vendorName, 'overrides' => $overrides, 'expenses' => $expenses, 'ovrgross' => $ovrGross, 'expgross' => $expGross]);
	}


	public function OverridesModal()
	{
		return view('invoices.overridesmodal');
	}


	public function searchInvoices()
	{
		$emps = DB::table('employees')
		          ->where('is_active', 1)
		          ->orderBy('name', 'asc')
		          ->get();

		$campaigns = DB::table('vendors')->orderBy('id', 'asc')->get();
		$vID = $campaigns->first(function($val, $key){
			return $val->name == 'Palmco';
		})->id;

		$dates = DB::table('invoices')
					->where('vendor', $vID)
					->get(['issue_date'])
					->unique()
					->values()
					->all();
		$dates = collect($dates)->sortByDesc('issue_date');

		$invoiceList = DB::table('invoices')->get();
		$invoiceList = $invoiceList->groupBy('issue_date')->all();

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


		return view('invoices.search', ['employees' => $emps, 'campaigns' => $campaigns, 'dates' => $dates, 'invoices' => $invoices]);
	}


	public function getSearchResults(Request $request)
	{
		$inputParams = $request->inputParams;
		$vID = $inputParams['vendorid'];
		$aID = $inputParams['agentid'];
		$date = $inputParams['issue_date'];
		// find invoice by id and then return filled out handsontable
		$data = DB::table('invoices')->where([
			['vendor', '=', $vID],
			['issue_date', '=', $date],
			['agentid', '=', $aID]
		])->get();

		$employees = DB::table('employees')->get();
		$vendors = DB::table('vendors')->get();
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
		$invoices = DB::table('invoices')
						->where([
							['agentid', '=', $agentID],
							['vendor', '=', $vendorID],
							['issue_date', '=', $issueDate]
						])->get();

		$overrides = DB::table('overrides')
						->where([
							['agentid', '=', $agentID],
							['issue_date', '=', $issueDate]
						])->get();

		$expenses = DB::table('expenses')
						->where([
							['agentid', '=', $agentID],
							['issue_date', '=', $issueDate]
						])->get();

		$employee = DB::table('employees')
						->where('id', '=', $invoices->first()->agentid)->first();

		$campaign = DB::table('vendors')
						->where('id', '=', $invoices->first()->vendor)->first();

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

		return view('invoices.edit', ['invoices' => $invoices, 'employee' => $employee, 'campaign' => $campaign, 'overrides' => $overrides, 'expenses' => $expenses, 'issueDate' => $issueDate, 'weekEnding' => $weekEnding, 'invoiceDate' => $invoiceDate]);
	}


	/*
	 * new paystubs module to support paystub searching and returning all employees
	 *
	 */
	public function paystubs()
	{
		$thisUser = DB::table('employees')->where('name', Auth::user()->name)->first();
		$admin = $thisUser->is_admin;
		$noSalaryEmps = DB::table('employees')->whereIn('name', ['Chris Payment', 'Terri Payment', 'Drew Payment', 'Bret Payment'])->get();

		$isAdmin = ($admin == 1) ? true : false;
		$vendor = 1; // explicitly set to Palmco

		if($isAdmin){
			$emps = DB::table('employees')->where('is_active', 1)->get();
			$emps = $emps->sortBy('name')->toArray();

			foreach($noSalaryEmps as $e){
				$emps = $this->unsetValue($emps, $e->name);
			}

			$emps = collect($emps);

			$paystubs = DB::table('invoices')
			              ->where('vendor', '=', $vendor)
			              ->groupBy('issue_date')
			              ->orderBy([
				              ['issue_date', 'desc'],
				              ['agentid', 'desc']
			              ])->get();
		} else {
			$list = DB::table('permissions')->where('emp_id', $thisUser->id)->first();

			// not admin, but has agents roll to them
			if(count($list) > 0){
				$list = explode('|', $list->roll_up);
				$emps = DB::table('employees')->get();
				$emps = $emps->sortBy('name');
				$emps = [];
				foreach($list as $val)
				{
					array_push($emps, $this->findObjectById($val, $emps));
				}
				$emps = collect($emps);

				$eIdList = [];
				foreach($emps as $e)
				{
					$eIdList[] = $e->agentid;
				}

				$paystubs = DB::table('invoices')
								->where(function($query) use ($vendor, $eIdList){
									$query->where('vendor', '=', $vendor)
										->whereIn('agentid', $eIdList);
								})
								->groupBy('issue_date')
								->orderBy([
									['issue_date', 'desc'],
									['agentid', 'desc']
								])->get();
			} else { // agent w/no roll up employees
				$emps = [];
				$me = DB::table('employees')
				        ->where('id', $thisUser->id)->get();
				array_push($emps, $this->findObjectById($thisUser->id, $me));
				$emps = collect($emps);

				$paystubs = DB::table('invoices')
								->where([
									['vendor', '=', $vendor],
									['agentid', '=', $thisUser->id]
								])
								->groupBy('issue_date')
								->orderBy([
									['issue_date', 'desc'],
									['agentid', 'desc']
								])->get();
			}
		}



		$agents = DB::table('employees')->where('is_active', 1)->get();

		return view('paystubs.paystubs', ['isAdmin' => $isAdmin, 'emps' => $emps, 'paystubs' => $paystubs, 'agents' => $agents]);
	}
}
