<?php


namespace App\Helpers;

use App\Expense;
use App\Invoice;
use App\Override;
use App\Vendor;
use Carbon\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use App\Employee;



class InvoiceHelper
{

	public function searchPaystubData($params)
	{
		$params = is_null($params) ? (object)['vendor' => -1, 'agent' => -1, 'date' => -1] : (object)$params;
		$thisUser = Auth::user()->employee->first();
		$admin = $thisUser->is_admin;
		$isAdmin = ($admin == 1);
		$date = ($params->date != -1) ? new Carbon($params->date) : $params->date;

		if($params->agent == -1)
		{
			if($isAdmin){
				$agents = Employee::active()->hideFromPayroll()->orderByName()->get();
				$rows = Invoice::vendorId($params->vendor)
				                   ->issueDate($date)
				                   ->agentId($agents->pluck('id')->toArray())
				                   ->latest('issue_date')
				                   ->latest('agentid')
				                   ->get();

				$paystubs = $rows->unique('agentid', 'issue_date');

				$overrides = Override::agentId($agents->pluck('id')->toArray())->issueDate($date)->get();
				$expenses = Expense::agentId($agents->pluck('id')->toArray())->issueDate($date)->get();

			} else {
				$list = $thisUser->permissions()->active()->get();
				if(count($list) > 0)
				{
					$empsResult = [];
					$empsResult[] = $thisUser;
					$empsResult[] = Employee::listOfAgents($list);
					$agents = collect($empsResult);

					$rows = Invoice::vendorId($params->vendor)
					                   ->issueDate($date)
					                   ->agentId($agents->pluck('id')->all())
					                   ->latest('issue_date')
					                   ->latest('agentid')
					                   ->withActiveAgent()
					                   ->get();

					$paystubs = $rows->unique('issue_date');

					$overrides = Override::agentId($agents->pluck('id')->toArray())->issueDate($date)->get();
					$expenses = Expense::agentId($agents->pluck('id')->toArray())->issueDate($date)->get();
				}
				else
				{
					$rows = Invoice::vendorId($params->vendor)
					                   ->issueDate($date)
					                   ->agentId($thisUser->id)
					                   ->latest('issue_date')
					                   ->withActiveAgent()
					                   ->get();

					$paystubs = $rows->unique('issue_date');

					$agents = Auth::user()->employee;

					$overrides = Override::agentId($agents->pluck('id')->toArray())->issueDate($date)->get();
					$expenses = Expense::agentId($agents->pluck('id')->toArray())->issueDate($date)->get();
				}
			}
		}
		else
		{
			$agents = Employee::active()->hideFromPayroll()->orderByName()->get();
			$rows = Invoice::vendorId($params->vendor)
								->issueDate($date)
								->agentId($params->agent)
								->latest('issue_date')
								->latest('agentid')
								->withActiveAgent()
								->get();

			$paystubs = $rows->unique('agentid', 'issue_date');

			$overrides = Override::agentId($agents->pluck('id')->toArray())->issueDate($date)->get();
			$expenses = Expense::agentId($agents->pluck('id')->toArray())->issueDate($date)->get();
		}

		$paystubs = collect($paystubs);
		$agents = collect($agents);
		$vendors = Vendor::all();

		return (object)[
			'stubs' => $paystubs,
			'agents' => $agents,
			'vendors' => $vendors,
			'rows' => $rows,
			'overrides' => $overrides,
			'expenses' => $expenses
		];
	}


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



	public function setPayrollData($invoices, $overrides, $expenses, $agentid)
	{
		$total = 0;
		$insert = [];

		if(count($invoices) > 0){
			$insert['agent_name'] = DB::table('employees')->where('id', '=', $invoices[0]['agentid'])->first()->name;
			$insert['pay_date'] = $invoices[0]['issue_date'];
		} else if(count($overrides) > 0){
			$insert['agent_name'] = DB::table('employees')->where('id', '=', $overrides[0]['agentid'])->first()->name;
			$insert['pay_date'] = $overrides[0]['issue_date'];
		} else if(count($expenses) > 0){
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


	public function getPaystubEmployeeListByLoggedInUser($authenticatedUser)
	{
		$noSalaryEmps = DB::table('employees')->whereIn('name', ['Chris Payment', 'Terri Payment', 'Drew Payment', 'Bret Payment'])->get();
		$admin = $authenticatedUser->is_admin;
		$mgr = $authenticatedUser->is_mgr;

		if($admin == 1)
		{
			$result = DB::table('employees')->where('is_active', 1)->get()->sortBy('name')->toArray();

			foreach($noSalaryEmps as $e){
				$result = $this->unsetValue($result, $e->name);
			}

			$result = collect($result);
			$result = $result->sortBy('name');
		}
		else if ($mgr == 1)
		{
			$list = Employee::find($authenticatedUser->id)->permissions()->get();
			$emps = Employee::all();
			$result = [];
			foreach($list as $l)
			{
				array_push($result, $this->findObjectById($l->emp_id, $emps));
			}
			$result = collect($result);
			$result = $result->sortBy('name');
		}
		else
		{
			$result = [];
			$me = Employee::find($authenticatedUser->id)->get();
			array_push($result, $this->findObjectById($authenticatedUser->id, $me));
			$result = collect($result);
		}

		return $result;
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



}
