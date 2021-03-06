<?php

namespace App\Http\Controllers;

use App\Employee;
use App\Expense;
use App\Helpers\Utilities;
use App\Invoice;
use App\Override;
use App\PayrollRestriction;
use App\Paystub;
use App\Services\SessionUtil;
use App\Vendor;
use Carbon\Carbon;
use DateTime;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\View\View;

class PayrollController extends Controller
{
	protected $session;
    protected $issueDates = [];
    protected $vendors = [];
    protected $limit;
    protected $utilities;

    public function __construct(SessionUtil $_session)
    {
    	$this->session = $_session;
    	$this->utilities = new Utilities();
    }

    #region WEB METHODS

    public function payrollDispute()
    {
        return view('emails.dispute');
    }

    public function confirmDeletePaystub()
    {
        return view('invoices.deletemodal');
    }

	/**
	 * URL: /payroll
	 * Description:
	 * This endpoints reflects the view when the user initially navigates to /payroll.
	 * It returns information necessary to load the page on initial navigation.
	 *
	 * @return View
	 */
    public function viewPayrollList(): View
    {
        $sessionUser = Auth::user()->employee;
		$isAdmin = ($sessionUser->is_admin == 1);
		$isManager = ($sessionUser->is_mgr == 1);

		$role = RoleType::Employee;
		if ($isAdmin)
		{
			$role = RoleType::Admin;
		}
		else if ($isManager)
		{
			$role = RoleType::Manager;
		}

		$this->issueDates = Paystub::latest('issue_date')
		                           ->get()
		                           ->unique('issue_date')
		                           ->pluck('issue_date');

		$this->vendors = Vendor::active()->get();
		$vendorDictionary = Vendor::all();

		$this->limit = PayrollRestriction::find(1);

		$agents = $this->getEmployeesByRole($role, $sessionUser->id);

		$data =
		[
			'isAdmin' => $isAdmin,
			'isManager' => $isManager,
			'emps' => $this->encode($agents),
			'issueDates' => $this->encode($this->issueDates),
			'vendors' => $this->encode($this->vendors),
			'vendorDictionary' => $this->encode($vendorDictionary)
		];

		return view('paystubs.paystubs', $data);
    }

    #endregion

	#region API METHODS

	/**
	 * URL: /agents/{agentId}/vendors/{vendorId}/dates/{issueDate}
	 * Description:
	 * NOT ACTUALLY SURE WHAT CALLS THIS?
	 *
	 * @param $agentID
	 * @param $vendorID
	 * @param $issueDate
	 *
	 * @return JsonResponse
	 * @throws \Exception
	 */
	public function getExistingInvoice($agentID, $vendorID, $issueDate): JsonResponse
	{
		if($vendorID < 1) return response()->json(false, 500);

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

		return response()->json(['invoices' => $invoices,
		                         'employee' => $employee,
		                         'campaign' => $campaign,
		                         'overrides' => $overrides,
		                         'expenses' => $expenses,
		                         'issueDate' => $issueDate,
		                         'weekEnding' => $weekEnding]);
	}

	#endregion

    #region PRIVATE METHODS

    private function encode($value)
    {
    	return json_encode($this->utilities->encodeJson($value));
    }

	private function getEmployeesByRole(int $roleType, int $userId): \Illuminate\Support\Collection
	{
		switch ($roleType)
		{
			case RoleType::Admin:
				return Employee::active()->hideFromPayroll()->orderByName()->get();
			case RoleType::Manager:
				return $this->getEmployeesAsManager($userId);
			case RoleType::Employee:
			default:
				return $this->getEmployeesAsEmployee($userId);
		}
	}

	private function getEmployeesAsEmployee($userId): \Illuminate\Support\Collection
	{
		$agents = collect([Auth::user()->employee]);
		$this->issueDates = Paystub::latest('issue_date')
			->agentId($userId)
			->get()
			->unique('issue_date')
			->pluck('issue_date');

		if ($this->issueDates->isNotEmpty())
		{
			$today = Carbon::now();
			$newIssueDates = [];

			foreach($this->issueDates as $key => &$issueDate)
			{
				$dt = Carbon::createFromFormat('Y-m-d', $issueDate);
				$nextWednesday = new Carbon('next wednesday');

				if ($dt->isBefore($today))
				{
					$newIssueDates[] = $issueDate;
				}
				else if ($dt->isBefore($nextWednesday))
				{
					$nextIssue = Carbon::createFromFormat('Y-m-d', $issueDate);
					$releaseRestrictionTime = $nextIssue->subDay()->setTime($this->limit->hour, $this->limit->minute);

					if ($today->isAfter($releaseRestrictionTime))
					{
						$newIssueDates[] = $issueDate;
					}
				}
			}

			$this->issueDates = $newIssueDates;
		}

		$invoiceVendors = Invoice::latest('issue_date')
			->agentId($userId)
			->get()
			->unique('vendor')
			->pluck('vendor');
		$this->vendors = $this->vendors->whereIn('id', $invoiceVendors);

		return $agents;
	}

	private function getEmployeesAsManager($userId): \Illuminate\Support\Collection
	{
		$agents = $this->session->getUserSubordinates($userId);

		if($this->issueDates->isNotEmpty())
		{
			$today = Carbon::now()->tz('America/Detroit');

			foreach($this->issueDates as $key => &$issueDate)
			{
				$issueDate = Carbon::createFromFormat('Y-m-d', $issueDate);
				$nextWednesday = new Carbon('next wednesday');
				if($issueDate > $nextWednesday) {
					unset($this->issueDates[$key]);
					// $issueDates = $issueDates->slice(1);
					// $issueDates = array_values((array)$issueDates);
				}
				else
				{
					$nextIssue = Carbon::createFromFormat('Y-m-d', $this->issueDates[$key]);
					$release = $nextIssue->subDay()->setTime($this->limit->hour, $this->limit->minute, 0);

					if($today < $release)
					{
						unset($this->issueDates[$key]);
						// $issueDates = $issueDates->slice(1);
					}
				}
			}
		}

		return $agents;
	}

	#endregion
}

abstract class RoleType
{
	const Admin = 0;
	const Manager = 1;
	const Employee = 2;
}
