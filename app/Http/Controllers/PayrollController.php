<?php

namespace App\Http\Controllers;

use App\Employee;
use App\Expense;
use App\Helpers\InvoiceHelper;
use App\Helpers\RoleType;
use App\Helpers\Utilities;
use App\Http\Results\OpResult;
use App\Invoice;
use App\Mail\PaystubNotification;
use App\Override;
use App\PayrollRestriction;
use App\Paystub;
use App\Plugins\Facade\PDF;
use App\Services\InvoiceService;
use App\Services\PaystubService;
use App\Services\SessionUtil;
use App\Vendor;
use Carbon\Carbon;
use DateTime;
use Illuminate\Contracts\Foundation\Application;
use Illuminate\Contracts\Routing\ResponseFactory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Routing\Redirector;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Mail;
use Illuminate\View\View;
use Symfony\Component\HttpFoundation\File\Exception\AccessDeniedException;

class PayrollController extends Controller
{
	protected $session;
    protected $issueDates = [];
    protected $vendors = [];
    protected $limit;
    protected $utilities;
	protected $invoiceHelper;
	protected $invoiceService;
	protected $paystubService;

    public function __construct(
    	SessionUtil $_session,
	    InvoiceHelper $_invoiceHelper,
	    InvoiceService $_invoiceService,
	    PaystubService $_paystubService
    ) {
    	$this->session = $_session;
    	$this->invoiceHelper = $_invoiceHelper;
    	$this->invoiceService = $_invoiceService;
    	$this->utilities = new Utilities();
    	$this->paystubService = $_paystubService;
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
	 * @return Application|RedirectResponse|Redirector|View
	 */
    public function viewPayrollList()
    {
	    if (!Auth::check())
	    {
	    	return redirect('/login');
	    }

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
	 * @param Request $request
	 * Search Params:
	 *  - employees int[]
	 *  - vendors int[]
	 *  - startDate DateTime
	 *  - endDate DateTime
	 *
	 * @return Application|JsonResponse|RedirectResponse|Redirector
	 */
	public function search(Request $request)
	{
		$result = new OpResult();

		if (!Auth::check())
		{
			return redirect('/login');
		}

		$employee_ids = $request->input('employees');
		$my_employee = $request->user()->employee;
		$is_admin = $my_employee->is_admin == 1;
		$is_manager = !$is_admin && $my_employee->is_mgr == 1;
		$vendors = $request->input('vendors');

		foreach ($employee_ids as $employee_id)
		{
			$this->invoiceHelper->hasAccessToEmployee($my_employee, $employee_id)
				->mergeInto($result);

			if ($result->hasError())
			{
				return $result->getResponse();
			}
		}

		$start_date = Carbon::createFromFormat(DateTime::ATOM, $request->input('startDate'));
		$end_date = Carbon::createFromFormat(DateTime::ATOM, $request->input('endDate'));

		if (!$start_date->isValid() || !$end_date->isValid())
		{
			return $result->setToFail('Invalid dates')
				->getResponse();
		}

		$issue_dates = Paystub::betweenDates($start_date, $end_date)
		                        ->pluck('issue_date')
								->distinct()
								->get();

		$accessible_issue_dates = [];
		foreach ($issue_dates as $issue_date)
		{
			$issue_date_result = new OpResult();

			$this->paystubService->checkAccessToIssueDate($my_employee->id, $issue_date)
				->mergeInto($issue_date_result);

			if ($issue_date_result->hasError())
			{
				continue;
			}
			else
			{
				$accessible_issue_dates[] = $issue_date;
			}
		}

		$qry = Paystub::byVendorIds($vendors)
			->byIssueDates($accessible_issue_dates);

		if (in_array(-1, $employee_ids))
		{
			if ($is_admin)
			{
				$result->setData(
					$qry->byAgentIds($employee_ids)
						->orderBy('agent_name')
						->get()
				);
			}
			else
			{
				$accessible_employee_ids = $my_employee->permissions()->active()->get()->pluck('emp_id')->all();

				if (count($accessible_employee_ids) > 0)
				{
					$employees_result = [];
					$employees_result[] = $my_employee;
					$accessible_employees = Employee::agentId($accessible_employee_ids)->get();

					if ($accessible_employees->count() > 1)
					{
						$employees_result = array_merge($employees_result, $accessible_employees->toArray());
					}
					else
					{
						$employees_result[] = $accessible_employees->first();
					}

					$employees_result = collect($employees_result);
					$emp_ids = $employees_result->pluck('id')->all();

					$qry = $qry->byAgentIds($emp_ids);
				}
				else
				{
					$qry = $qry->agentId($my_employee->id);
				}
			}
		}
		else
		{
			$qry = $qry->byAgentIds($employee_ids);
		}

		$paystubs = $qry->orderBy('agent_name')->get();

		return $result->setData($paystubs)->getResponse();
	}

	/**
	 * URL: /payroll/employees/{employeeId}/vendors/{vendorId}/issue-dates/{issueDate}
	 * Description:
	 * Called from Angular when when user clicks "Search" button payroll list.
	 *
	 * @param Request $request
	 * @param $employeeId
	 * @param $vendorId
	 * @param $issueDate
	 *
	 * @return JsonResponse
	 */
	public function getPaystubs(Request $request, $employeeId, $vendorId, $issueDate): JsonResponse {
		$result = new OpResult();

		$user = $request->user()->employee;
		$this->invoiceHelper->hasAccessToEmployee($user, $employeeId)->mergeInto($result);

		if ($result->hasError()) return $result->getResponse();

		$this->paystubService->checkAccessToIssueDate($user->id, $issueDate)->mergeInto($result);

		if ($result->hasError()) return $result->getResponse();

		$args = [
			'vendor' => $vendorId,
			'agent' => $employeeId,
			'date' => $issueDate
		];

		$data = $this->invoiceHelper->searchPaystubData($args);

		if (!is_null($data))
		{
			$result->setDataOnSuccess($data);
		}

		return $result->getResponse();
	}

	/**
	 * URL: /payroll/employees/{employeeId}/paystubs/{paystubId}
	 * Description:
	 * Show's an employee's paystub detail
	 *
	 * @param Request $request
	 * @param $employeeId
	 * @param $paystubId
	 *
	 * @return View
	 */
	public function showPaystubDetailByPaystubId(Request $request, $employeeId, $paystubId): View {
		$result = new OpResult();

		$user = $request->user()->employee;
		$this->invoiceHelper->hasAccessToEmployee($user, $employeeId)->mergeInto($result);

		if ($result->hasError())
		{
			return back()->withError($result->getResponse())->withInput();
		}

		$paystub = Paystub::find($paystubId);

		if (is_null($paystub))
		{
			return back()->withError('Fatal error, please refresh the page and try again.')->withInput();
		}

		$issueDate = Carbon::createFromFormat('Y-m-d', $paystub->issue_date);

		return $this->invoiceService->getPaystubView($employeeId, $paystub->vendor_id, $issueDate);
	}

	/**
	 * URL: /agents/{agentId}/vendors/{vendorId}/dates/{issueDate}
	 * Description:
	 * Returns the entire invoice in JsonResponse. This is the same as InvoiceController@editInvoice
	 * and could be used to show a "peak" of the invoice or something for a quick view.
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

	/**
	 * @param Request $request
	 *
	 * @return Application|ResponseFactory|JsonResponse|Response
	 */
	public function sendPaystubs(Request $request)
	{
		$result = new OpResult();
		$user = $request->user()->employee;

		$this->session->checkUserIsAdmin()->mergeInto($result);

		if ($result->hasError())
		{
			return response('You must be an admin.', 400);
		}

		// SEND PAYSTUBS
		$paystubIds = $request->input('ids');

		$paystubs = Paystub::with('agent')->whereIn('id', $paystubIds)->get();

		foreach ($paystubs as $p)
		{
			$accessResult = $this->invoiceHelper->hasAccessToEmployee($user, $p->agent_id);

			if ($accessResult->hasError()) continue;

			$pdfResult = $this->paystubService->buildPaystubPdf($p->agent_id, $p->vendor_id, $p->issue_date);
			$pdfData = null;

			if (!$pdfResult->hasError())
			{
				$pdfData = $pdfResult->getData()->output();
			}

			Mail::to($p->agent->email)
				->queue(new PaystubNotification($p, $pdfData));
		}

		return response();
	}

	#endregion

    #region PRIVATE METHODS

    private function encode($value)
    {
    	return json_encode($this->utilities->encodeJson($value));
    }

	/**
	 * @param int $roleType
	 * @param int $userId
	 *
	 * @return Collection
	 */
	private function getEmployeesByRole(int $roleType, int $userId): Collection
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

	/**
	 * @param $userId
	 *
	 * @return Collection
	 */
	private function getEmployeesAsEmployee($userId): Collection
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

	/**
	 * @param $userId
	 *
	 * @return Collection
	 */
	private function getEmployeesAsManager($userId): Collection
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

