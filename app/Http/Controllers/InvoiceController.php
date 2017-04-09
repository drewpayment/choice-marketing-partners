<?php

namespace App\Http\Controllers;

use App\Http\Requests;
use App\Invoice;
use DateTime;
use DateInterval;
use Doctrine\DBAL\Driver\Mysqli\MysqliException;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Exception;
use Illuminate\Http\Request;

class InvoiceController extends Controller
{
    /**
	 * Middleware
	 */
	public function __construct()
	{
		$this->middleware('auth');
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
		$dt = new DateTime();

		for($i = 0; $i < 3; $i++)
		{
			if($i == 0){
				$dt = strtotime('wednesday');
				$wedArr[] = date('m-d-Y', $dt);
			}
			else if($i == 1)
			{
				$dt = strtotime('next wednesday');
				$wedArr[] = date('m-d-Y', $dt);
			}
			else 
			{
				$dt = strtotime('+'. $i .' week wednesday');
				$wedArr[] = date('m-d-Y', $dt);
			}
		}


		return view('invoices.upload', ['emps' => $emps, 'weds' => $wedArr, 'vendors' => $vendors]);
	}


	public function HandleEditExistingInvoice(Request $request)
	{
		$salesInput = $request->sales;
		$overrideInput = $request->overrides;
		$expenseInput = $request->expenses;
		$salesArr = [];
		$overArr = [];
		$expArr = [];
		$exception = null;
		$payrollData = [];

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
				DB::table('invoices')->where([
					['agentid', '=', $salesArr[0]['agentid']],
					['vendor', '=', $salesArr[0]['vendor']],
					['issue_date', '=', $salesArr[0]['issue_date']]
				])->delete();
				DB::table('invoices')->insert($salesArr);
			}
			if(!is_null($overArr))
			{
				DB::table('overrides')->where([
					['agentid', '=', $overArr[0]['agentid']],
					['issue_date', '=', $overArr[0]['issue_date']]
				])->delete();
				DB::table('overrides')->insert($overArr);
			}
			if(!is_null($expArr))
			{
				DB::table('expenses')->where([
					['agentid', '=', $expArr[0]['agentid']],
					['issue_date', '=', $expArr[0]['issue_date']]
				])->delete();
				DB::table('expenses')->insert($expArr);
			}
		}
		catch(Exception $e)
		{
			return response()->json('false');
		}

		$agentid = ($salesInput[0]['agentid'] > 0) ? $salesInput[0]['agentid'] : $overrideInput[0]['agentid'];
		$result = is_null($exception) ? true : $exception;

		$payrollData[] = $this->setPayrollData($salesArr, $overArr, $expArr, $agentid);

		try{
			DB::table('payroll')->insert($payrollData);
		}
		catch(Exception $e)
		{
			return response()->json('false');
		}

		return response()->json($result);
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
			return response()->json('false');
		}

		$agentid = ($salesInput[0]['agentid'] > 0) ? $salesInput[0]['agentid'] : $overrideInput[0]['agentid'];
		$result = is_null($exception) ? true : $exception;

		$payrollData[] = $this->setPayrollData($salesArr, $overArr, $expArr, $agentid);

		try{
			DB::table('payroll')->insert($payrollData);
		}
		catch(Exception $e)
		{
			return response()->json('false');
		}

		return response()->json($result);
	}


	public function setPayrollData($invoices, $overrides, $expenses, $agentid)
	{
		$total = 0;
		$insert = [];

		if(count($invoices) > 0){
			$insert['agent_name'] = DB::table('employees')->where('id', '=', $invoices[0]['agentid'])->first()->name;
			$insert['pay_date'] = $invoices[0]['issue_date'];
		}

		if(count($overrides) > 0){
			$insert['agent_name'] = DB::table('employees')->where('id', '=', $overrides[0]['agentid'])->first()->name;
			$insert['pay_date'] = $overrides[0]['issue_date'];
		}

		if(count($expenses) > 0){
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
						->where('issue_date', '=', $date)
						->where('agentid', '=', $agentId)
						->get();

		$emp = DB::table('employees')
						->select('*')
						->where('id', '=', $agentId)
						->first();

		$vendorId = $stubs->first()->vendor;
		$vendorName = DB::table('vendors')
						->select('name')
						->where('id', '=', $vendorId)
						->get();
		$vendorName = $vendorName->first()->name;

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
							])
							->get();

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

		$campaigns = DB::table('vendors')->orderBy('name', 'desc')->get();

		$dates = DB::table('invoices')
					->where('vendor', 7)
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
				return $v->id == $vendorId;
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
}
