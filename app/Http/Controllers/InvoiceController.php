<?php

namespace App\Http\Controllers;

use App\Employee;
use App\Expense;
use App\Helpers\InvoiceHelper;
use App\Invoice;
use App\Override;
use App\Payroll;
use App\PayrollRestriction;
use App\Paystub;
use App\Services\DbHelper;
use App\Services\InvoiceService;
use App\Services\PaystubService;
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
    protected $invoiceService;
    protected $paystubService;

	/**
	 * Middleware and helpers wiring
	 *
	 * @param InvoiceHelper $_invoiceHelper
	 * @param InvoiceService $invoice_service
	 */
	public function __construct(InvoiceHelper $_invoiceHelper, InvoiceService $invoice_service, PaystubService $paystub_service)
	{
		$this->middleware('auth');
		$this->invoiceHelper = $_invoiceHelper;
		$this->invoiceService = $invoice_service;
		$this->paystubService = $paystub_service;
	}


	public function index()
	{
		$emps = Employee::active()->hideFromPayroll()->orderByName()->get();
		$vendors = Vendor::active()->get();
		$wedArr = [];

		for($i = 0; $i < 6; $i++){
			$dt = Carbon::parse('this wednesday');
			$tmpDt = $dt->addWeek($i);
			$wedArr[] = $tmpDt->format('m-d-Y');
		}


		return view('invoices.upload', ['emps' => $emps, 'weds' => $wedArr, 'vendors' => $vendors]);
	}


	public function HandleEditInvoice()
	{
		if(!request()->ajax()) return response()->json(false);

		$input = json_decode(Input::all()['input'], true);
		$result = $this->invoiceService->editInvoice($input);

		return response()->json($result);
	}


	/**
	 * Save invoice via ajax --- new module
	 *
	 */
	public function SaveInvoice()
	{
		if(!request()->ajax())
			return response()->json(false);

		$input = json_decode(Input::all()['input'], true);
		$result = $this->invoiceService->saveInvoice($input);

		return response()->json($result);
	}


	/**
	 * Upload invoice from handsontable
	 *
	 * @param Request $request
	 *
	 * @return \Illuminate\Http\JsonResponse
	 * @throws \Illuminate\Support\Facades\Exception
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


	/**
	 * Delete existing paystub.
	 *
	 * @param Request $request
	 *
	 * @return \Illuminate\Http\JsonResponse
	 * @throws \Illuminate\Support\Facades\Exception
	 */
	public function deletePaystub(Request $request)
	{
		$params = $request->all();
		$id = $params["id"];
		$vendor = $params["vendor"];
		$date = $params["date"];
		$date = date_create_from_format('m-d-Y', $date);
		$date = $date->format('Y-m-d');

		DB::beginTransaction();
		try{
			Invoice::agentId($id)->vendorId($vendor)->issueDate($date)->delete();
			Expense::agentId($id)->vendorId($vendor)->issueDate($date)->delete();
			Override::agentId($id)->vendorId($vendor)->issueDate($date)->delete();
			Paystub::agentId($id)->vendorId($vendor)->issueDate($date)->delete();

			DB::commit();
			$result = true;
		} catch (\mysqli_sql_exception $e)
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


	/**
	 * The main landing page for the paystub module.
	 *
	 * @return \Illuminate\Contracts\View\Factory|\Illuminate\View\View
	 */
	public function payrollViewer()
	{
		$sessionUser = Auth::user()->employee;
		$isAdmin = ($sessionUser->is_admin == 1);
		$isManager = ($sessionUser->is_mgr == 1);

		$issueDates = Paystub::latest('issue_date')->get()->unique('issue_date')->pluck('issue_date');

		$vendors = Vendor::active()->get();
		$vendorDictionary = Vendor::all();

		$limit = PayrollRestriction::find(1);

		// This employee is an admin user
		if($isAdmin)
		{
			$agents = Employee::active()->hideFromPayroll()->orderByName()->get();
		}
		// This employee is a manager
		else if($isManager)
		{
			$rollList = $sessionUser->permissions()->active()->get();
			$agents = Employee::agentId($rollList->pluck('emp_id')->all())->get();
			$agents[] = $sessionUser;
			$agents = collect($agents);

			if(count($issueDates) > 0)
			{
				$today = Carbon::now()->tz('America/Detroit');

				foreach($issueDates as $key => &$issueDate)
				{
					$issueDate = Carbon::createFromFormat('Y-m-d', $issueDate, 'America/Detroit');
					$nextWednesday = new Carbon('next wednesday');
					if($issueDate > $nextWednesday) {
						unset($issueDates[$key]);
						// $issueDates = $issueDates->slice(1);
						// $issueDates = array_values((array)$issueDates);
					}
					else
					{
						$nextIssue = Carbon::createFromFormat('Y-m-d', $issueDates[$key], 'America/Detroit');
						$release = $nextIssue->subDay()->setTime($limit->hour, $limit->minute, 0);
	
						if($today < $release)
						{
							unset($issueDates[$key]);
							// $issueDates = $issueDates->slice(1);
						}
					}
				}
			}
		}
		// This is a normal user
		else
		{
			$agents = collect(array(Auth::user()->employee));
			$issueDates = Paystub::latest('issue_date')->agentId($agents[0]['id'])
									->get()->unique('issue_date')->pluck('issue_date');

			if(count($issueDates) > 0)
			{
				$today = Carbon::now()->tz('America/Detroit');

				foreach($issueDates as $key => &$issueDate)
				{
					$issueDate = Carbon::createFromFormat('Y-m-d', $issueDate, 'America/Detroit');
					$nextWednesday = new Carbon('next wednesday');
					if($issueDate > $nextWednesday) {
						unset($issueDates[$key]);
						// $issueDates = $issueDates->slice(1);
						// $issueDates = array_values((array)$issueDates);
					}
					else
					{
						$nextIssue = Carbon::createFromFormat('Y-m-d', $issueDates[$key], 'America/Detroit');
						$release = $nextIssue->subDay()->setTime($limit->hour, $limit->minute, 0);
	
						if($today < $release)
						{
							unset($issueDates[$key]);
							// $issueDates = $issueDates->slice(1);
						}
					}
				}
			}

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
		$agents = collect($agents);
		$emps = Employee::active()->get();

		return view('paystubs.paystubs',
			['isAdmin' => $isAdmin,
			 'isManager' => $isManager,
			 'emps' => $emps,
			 'agents' => $agents,
			 'issueDates' => $issueDates,
			 'vendors' => $vendors,
			 'vendorDictionary' => $vendorDictionary]);
	}


	/**
	 * BEING REPLACED BY NEWER VERSION THAT USES NEW PAYSTUB MODEL
	 * The main landing page for the paystub module.
	 *
	 * @return \Illuminate\Contracts\View\Factory|\Illuminate\View\View
	 */
//	public function payrollViewerBACKUP()
//	{
//		$sessionUser = Auth::user()->employee;
//		$isAdmin = ($sessionUser->is_admin == 1);
//		$isManager = ($sessionUser->is_mgr == 1);
//
//		$issueDates = Invoice::latest('issue_date')->withActiveAgent()
//								->get()->unique('issue_date')->pluck('issue_date');
//
//		$vendors = Vendor::active()->get();
//		$vendorDictionary = Vendor::all();
//
//		/**
//		 * ADMIN USERS
//		 */
//		if($isAdmin)
//		{
//			$agents = Employee::active()->hideFromPayroll()->orderByName()->get();
//
//		}
//		/**
//		 * MANAGER USERS
//		 */
//		else if($isManager)
//		{
//			$rollList = $sessionUser->permissions()->active()->get();
//			$agents = Employee::agentId($rollList->pluck('emp_id')->all())->get();
//			$agents[] = $sessionUser;
//			$agents = collect($agents);
//		}
//		/**
//		 * NON-ADMIN USERS
//		 */
//		else
//		{
//			$agents = collect(array(Auth::user()->employee));
//			$issueDates = Invoice::latest('issue_date')->agentId($agents[0]['id'])
//			                     ->get()->unique('issue_date')->pluck('issue_date');
//
//			// checks to see if we can release this week's paystub information
//			// to non-admin users yet.
//			if(count($issueDates) > 0)
//			{
//				$today = Carbon::now()->tz('America/Detroit');
//				$nextIssue = Carbon::createFromFormat('Y-m-d', $issueDates[0], 'America/Detroit');
//				$release = $nextIssue->subDay()->setTime(20, 0, 0);
//
//				if($today < $release)
//				{
//					$issueDates = $issueDates->slice(1);
//				}
//			}
//
//			$vendors = Invoice::latest('issue_date')->agentId($agents[0]['id'])->get()->unique('vendor');
//			$vendors = collect($vendors);
//
//			foreach($vendors as $v)
//			{
//				$name = $vendorDictionary->first(function($value, $k)use($v){
//					return $v->vendor == $value->id;
//				});
//				$v['name'] = $name->name;
//			}
//		}
//
//		$issueDates = collect($issueDates);
//		$agents = collect($agents);
//		$emps = Employee::active()->get();
//
//		return view('paystubs.paystubs',
//			['isAdmin' => $isAdmin,
//			 'isManager' => $isManager,
//			 'emps' => $emps,
//			 'agents' => $agents,
//			 'issueDates' => $issueDates,
//			 'vendors' => $vendors,
//			 'vendorDictionary' => $vendorDictionary]);
//	}


	/**
	 * new paystubs module to support paystub searching and returning all employees
	 *
	 */
//	public function paystubs()
//	{
//		$thisUser = Auth::user()->employee;
//		$admin = $thisUser->is_admin;
//		$isManager = ($thisUser->is_mgr == 1);
//
//		$isAdmin = ($admin == 1);
//		$vendor = -1;
//		$date = Invoice::latest('issue_date')->first()->issue_date;
//
//		$issueDates = Invoice::latest('issue_date')->withActiveAgent()
//						->get()->unique('issue_date')->pluck('issue_date');
//
//		$vendors = Vendor::active()->get();
//		$vendorDictionary = Vendor::all();
//		$vendorDictionary = collect($vendorDictionary);
//
//		/**
//		 * ADMIN USERS
//		 */
//		if($isAdmin){
//			$agents = Employee::active()->hideFromPayroll()->orderByName()->get();
//			$rows = Invoice::vendorId($vendor)
//							->issueDate($date)
//							->agentId($agents->pluck('id')->toArray())
//							->latest('issue_date')
//							->latest('agentid')
//							->latest('vendor')
//							->withActiveAgent()
//							->get();
//
//			$paystubs = $rows->unique(function($item){
//				return $item['agentid'].$item['vendor'];
//			});
//
//			$overrides = Override::agentId($agents->pluck('id')->toArray())
//                               ->issueDate($date)
//                               ->get();
//			$expenses = Expense::agentId($agents->pluck('id')->toArray())
//			                   ->issueDate($date)
//			                   ->get();
//
//		}
//		/**
//		 * MANAGERS
//		 */
//		else if ($isManager)
//		{
//			$list = $thisUser->permissions()->active()->get();
//
//			$empsResult = Employee::agentId($list->pluck('emp_id')->all())->get();
//			$empsResult[] = $thisUser;
//			$agents = collect($empsResult);
//
//			$rows = Invoice::vendorId($vendor)
//			               ->issueDate($date)
//			               ->agentId($agents->pluck('id')->all())
//			               ->latest('issue_date')
//			               ->latest('agentid')
//			               ->latest('vendor')
//			               ->withActiveAgent()
//			               ->get();
//			$paystubs = $rows->unique(function($item){
//				return $item['agentid'].$item['vendor'];
//			});
//
//			$overrides = Override::agentId($agents->pluck('id')->all())->issueDate($date)->get();
//			$expenses = Expense::agentId($agents->pluck('id')->all())->issueDate($date)->get();
//		}
//		/**
//		 * AGENTS
//		 */
//		else
//		{
//			$agents = collect(array(Auth::user()->employee));
//			$issueDates = Invoice::latest('issue_date')->agentId($agents[0]['id'])
//			                     ->get()->unique('issue_date')->pluck('issue_date');
//
//			if(count($issueDates) > 0)
//			{
//				$today = Carbon::now()->tz('America/Detroit');
//				$nextIssue = Carbon::createFromFormat('Y-m-d', $issueDates[0], 'America/Detroit');
//				$release = $nextIssue->subDay()->setTime(20, 0, 0);
//
//				if($today < $release)
//				{
//					$issueDates = $issueDates->slice(1);
//					$date = (!isset($issueDates[0])) ? Carbon::createFromFormat('Y-m-d', $date)->previous(Carbon::WEDNESDAY)->toDateTimeString() : $issueDates[0];
//				}
//			}
//
//			$rows = Invoice::vendorId($vendor)
//			               ->issueDate($date)
//			               ->agentId($thisUser->id)
//			               ->latest('issue_date')
//			               ->latest('vendor')
//			               ->withActiveAgent()
//			               ->get();
//
//			$paystubs = $rows->unique(function($item){
//				return $item['agentid'].$item['vendor'];
//			});
//
//
//			$overrides = Override::agentId($agents->pluck('id')->all())->issueDate($date)->get();
//			$expenses = Expense::agentId($agents->pluck('id')->all())->issueDate($date)->get();
//
//			$vendors = Invoice::latest('issue_date')->agentId($agents[0]['id'])->get()->unique('vendor');
//			$vendors = collect($vendors);
//
//			foreach($vendors as $v)
//			{
//				$name = $vendorDictionary->first(function($value, $k)use($v){
//					return $v->vendor == $value->id;
//				});
//				$v['name'] = $name->name;
//			}
//		}
//
//		$issueDates = collect($issueDates);
//		$paystubs = collect($paystubs);
//		$agents = collect($agents);
//		$emps = Employee::active()->get();
//
//
//		return view('paystubs.paystubs',
//			['isAdmin' => $isAdmin,
//			 'isManager' => $isManager,
//			 'emps' => $emps,
//			 'paystubs' => $paystubs,
//			 'agents' => $agents,
//			 'issueDates' => $issueDates,
//			 'vendors' => $vendors,
//			 'vendorDictionary' => $vendorDictionary,
//			 'rows' => $rows,
//			 'overrides' => $overrides,
//			 'expenses' => $expenses]);
//	}


	function array_insert($array, $var, $position)
	{
		$before = array_slice($array, 0, $position);
		$after = array_slice($array, $position);

		$return = array_merge($before, (array) $var);
		return array_merge($return, $after);
	}


	/**
	 * Fired from "filter" button on /payroll view. Takes date, vendor and agent params
	 * and get paystub data for the params.
	 *
	 * @param Request $request
	 *
	 * @return \Illuminate\Contracts\View\Factory|\Illuminate\Http\JsonResponse|\Illuminate\View\View
	 */
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
			'isAdmin' => $results->isAdmin,
			'isManager' => $results->isManager
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

		$emp = Employee::find($agentId);
		$vendorId = $inputParams['vendor'];
		$vendorName = Vendor::find($vendorId)->name;

		$stubs = Invoice::agentId($agentId)->vendorId($vendorId)->issueDate($sqlDate)->get();

		foreach($stubs as $s)
		{
			if(is_numeric($s->amount))
			{
				$gross = $gross + $s->amount;
			}

			$s->sale_date = strtotime($s->sale_date);
			$s->sale_date = date('m-d-Y', $s->sale_date);
		}

		$overrides = Override::agentId($agentId)->vendorId($vendorId)->issueDate($sqlDate)->get();
		$expenses = Expense::agentId($agentId)->vendorId($vendorId)->issueDate($sqlDate)->get();

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
