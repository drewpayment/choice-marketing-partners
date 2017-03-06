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
		$emps = DB::table('employees')->where('is_active', 1)->get()->toArray();
		foreach($noSalaryEmps as $e){
			$emps = $this->unsetValue($emps, $e);
		}
		$emps = collect($emps);
		$vendors = DB::table('vendors')->get();
		$wedArr = [];
		$dt = new DateTime();

		for($i = 1; $i < 4; $i++)
		{
			if($i == 1)
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


		$result = is_null($exception) ? true : $exception;

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
			$result = DB::table('employees')->where('is_active', 1)->get()->toArray();

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
				$result = [];
				foreach($list as $val)
				{
					array_push($result, $this->findObjectById($val, $emps));
				}
				$result = collect($result);
			} else {
				$result = [];
				$result[] = $thisUser->id;
			}

		}


		return view('invoices.historical', ['emps' => $result, 'self' => $thisUser]);
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
		$id = $request->id;
		$dates = [];
		$list = DB::table('invoices')
						->select('issue_date')
						->where('agentid', '=', $id)
						->groupBy('issue_date')
						->get();

		foreach($list as $dt)
		{
			$dates[] = date('m-d-Y', strtotime($dt->issue_date));
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
}
