<?php


namespace App\Helpers;

use App\User;
use App\Vendor;
use App\Expense;
use App\Invoice;
use App\Paystub;
use App\Employee;
use App\Http\Results\OpResult;
use App\Override;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;



class InvoiceHelper
{

	public function searchPaystubData($params)
	{
		$params = is_null($params) ? (object)['vendor' => -1, 'agent' => -1, 'date' => -1] : (object)$params;
		$thisUser = Auth::user()->employee;
		$isAdmin = ($thisUser->is_admin == 1);
		$isManager = ($thisUser->is_mgr == 1);
		$date = ($params->date != -1) ? new Carbon($params->date) : $params->date;
		$vendor = $params->vendor;

		if($params->agent == -1)
		{
			if($isAdmin){
				$agents = Employee::active()->hideFromPayroll()->orderByName()->get();
				$rows = Paystub::vendorId($vendor)
								->issueDate($date)
								->agentId($agents->pluck('id')->toArray())
								->orderBy('agent_name')
								->get();

			} else {
				$list = $thisUser->permissions()->active()->get();
				if(count($list) > 0)
				{
					$empsResult = [];
					$empsResult[] = $thisUser;
					$rolls = Employee::agentId($list->pluck('emp_id')->all())->get();
					if($rolls->count() > 1)
					{
						$empsResult = array_merge($empsResult, $rolls->toArray());
					}
					else
					{
						$empsResult[] = $rolls->first();
					}
					$agents = collect($empsResult);

					$rows = Paystub::vendorId($params->vendor)
					               ->issueDate($date)
					               ->agentId($agents->pluck('id')->all())
								   ->orderBy('agent_name')
					               ->get();
				}
				else
				{
					$agents = Auth::user()->employee;
					$rows = Paystub::vendorId($params->vendor)
					               ->issueDate($date)
					               ->agentId($thisUser->id)
								   ->orderBy('agent_name')
					               ->get();
				}
			}
		}
		else
		{
			$agents = Employee::active()->hideFromPayroll()->orderByName()->get();
			$rows = Paystub::vendorId($params->vendor)
			               ->issueDate($date)
			               ->agentId($params->agent)
						   ->orderBy('agent_name')
			               ->get();
		}

		$paystubs = collect($rows);
		$agents = collect($agents);
		$vendors = Vendor::all();

		return (object)[
			// 'stubs' => $paystubs,
			// 'agents' => $agents,
			// 'vendors' => $vendors,
			'rows' => $rows,
			// 'isAdmin' => $isAdmin,
			// 'isManager' => $isManager
		];
    }
    
    /**
     * Undocumented function
     *
     * @param Employee $user
     * @param integer $employeeId
     * @return OpResult
     */
    public function hasAccessToEmployee(Employee $user, $employeeId)
    {
        $result = new OpResult();
        $childUsers = $user->permissions->pluck('emp_id');
        $isManager = $user->is_mgr == 1;
        $isAdmin = $user->is_admin == 1;
            
        return $isAdmin || ($childUsers->contains($employeeId) && $isManager)
            ? $result->setToSuccess()
            : $result->setToFail('User does not have permission to access employee');
    }


	/**
	 * BACKUP --- BEING REPLACED FOR NEWER VERSION THAT USES PAYSTUB MODEL
	 * Used to search paystub information
	 *
	 * @param $params
	 *
	 * @return object
	 */
//	public function searchPaystubDataBACKUP($params)
//	{
//		$params = is_null($params) ? (object)['vendor' => -1, 'agent' => -1, 'date' => -1] : (object)$params;
//		$thisUser = Auth::user()->employee;
//		$isAdmin = ($thisUser->is_admin == 1);
//		$isManager = ($thisUser->is_mgr == 1);
//		$date = ($params->date != -1) ? new Carbon($params->date) : $params->date;
//		$vendor = $params->vendor;
//
//		if($params->agent == -1)
//		{
//			if($isAdmin){
//				$agents = Employee::active()->hideFromPayroll()->orderByName()->get();
//				$rows = Invoice::vendorId($vendor)
//				               ->issueDate($date)
//				               ->agentId($agents->pluck('id')->toArray())
//				               ->latest('issue_date')
//				               ->latest('agentid')
//							   ->latest('vendor')
//				               ->withActiveAgent()
//				               ->get();
//
//				$paystubs = $rows->unique(function($item){
//					return $item['agentid'].$item['vendor'];
//				});
//				$overrides = Override::agentId($agents->pluck('id')->toArray())
//				                     ->issueDate($date)
//				                     ->get();
//				$expenses = Expense::agentId($agents->pluck('id')->toArray())
//				                   ->issueDate($date)
//				                   ->get();
//
//			} else {
//				$list = $thisUser->permissions()->active()->get();
//				if(count($list) > 0)
//				{
//					$empsResult = [];
//					$empsResult[] = $thisUser;
//					$rolls = Employee::agentId($list->pluck('emp_id')->all())->get();
//					if($rolls->count() > 1)
//					{
//						$empsResult = array_merge($empsResult, $rolls->toArray());
//					}
//					else
//					{
//						$empsResult[] = $rolls->first();
//					}
//					$agents = collect($empsResult);
//
//					$rows = Invoice::vendorId($params->vendor)
//					                   ->issueDate($date)
//					                   ->agentId($agents->pluck('id')->all())
//					                   ->latest('issue_date')
//					                   ->latest('agentid')
//									   ->latest('vendor')
//					                   ->withActiveAgent()
//					                   ->get();
//
//					$paystubs = $rows->unique(function($item){
//						return $item['agentid'].$item['vendor'];
//					});
//
//
//					$overrides = Override::agentId($agents->pluck('id')->toArray())
//					                     ->issueDate($date)
//					                     ->get();
//					$expenses = Expense::agentId($agents->pluck('id')->toArray())
//					                   ->issueDate($date)
//					                   ->get();
//				}
//				else
//				{
//					$rows = Invoice::vendorId($params->vendor)
//					                   ->issueDate($date)
//					                   ->agentId($thisUser->id)
//					                   ->latest('issue_date')
//									   ->latest('vendor')
//					                   ->withActiveAgent()
//					                   ->get();
//
//					$paystubs = $rows->unique(function($item){
//						return $item['agentid'].$item['vendor'];
//					});
//
//					$agents = Auth::user()->employee;
//
//					$overrides = Override::agentId($agents->pluck('id')->toArray())
//					                     ->issueDate($date)
//					                     ->get();
//					$expenses = Expense::agentId($agents->pluck('id')->toArray())
//					                   ->issueDate($date)
//					                   ->get();
//				}
//			}
//		}
//		else
//		{
//			$agents = Employee::active()->hideFromPayroll()->orderByName()->get();
//			$rows = Invoice::vendorId($params->vendor)
//								->issueDate($date)
//								->agentId($params->agent)
//								->latest('issue_date')
//								->latest('agentid')
//								->latest('vendor')
//								->withActiveAgent()
//								->get();
//
//			$paystubs = $rows->unique(function($item){
//				return $item['agentid'].$item['vendor'];
//			});
//
//			$overrides = Override::agentId($agents->pluck('id')->toArray())
//			                     ->issueDate($date)
//			                     ->get();
//			$expenses = Expense::agentId($agents->pluck('id')->toArray())
//			                   ->issueDate($date)
//			                   ->get();
//		}
//
//		$paystubs = collect($paystubs);
//		$agents = collect($agents);
//		$vendors = Vendor::all();
//
//		return (object)[
//			'stubs' => $paystubs,
//			'agents' => $agents,
//			'vendors' => $vendors,
//			'rows' => $rows,
//			'overrides' => $overrides,
//			'expenses' => $expenses,
//			'isAdmin' => $isAdmin,
//			'isManager' => $isManager
//		];
//	}


	/*
	 * Check for existing invoices, return bool
	 *
	 */
	/**
	 * @param $agentId
	 * @param $vendor
	 * @param $date
	 *
	 * @return bool
	 */
	public function checkForExistingInvoice($agentId, $vendor, $date)
	{
		$dt = Carbon::parse($date)->format('Y-m-d');
		$invoices = Invoice::agentId($agentId)->vendorId($vendor)->issueDate($dt)->get();
		$overrides = Override::agentId($agentId)->vendorId($vendor)->issueDate($dt)->get();
		$expenses = Expense::agentId($agentId)->vendorId($vendor)->issueDate($dt)->get();

		if($invoices->count() > 0 || $overrides->count() > 0 || $expenses->count() > 0){
			return true;
		} else {
			return false;
		}

	}



	public function setPayrollData($invoices, $overrides, $expenses, $agentid, $vendor)
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

		$insert['vendor_id'] = $vendor;
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
