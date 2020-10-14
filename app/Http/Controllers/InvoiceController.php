<?php

namespace App\Http\Controllers;

use DateTime;
use Exception;
use App\Vendor;
use App\Expense;
use App\Invoice;
use App\Payroll;
use App\Paystub;
use App\Employee;
use App\Override;
use Carbon\Carbon;
use App\Services\DbHelper;
use App\PayrollRestriction;
use Illuminate\Http\Request;
use Illuminate\Mail\Mailable;
use App\Helpers\InvoiceHelper;
use App\Helpers\Utilities;
use App\Http\Results\OpResult;
use App\Plugins\Facade\PDF;
use App\Services\InvoiceService;
use App\Services\PaystubService;
use App\Services\SessionUtil;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\View;
use Illuminate\Support\Facades\Input;
use Illuminate\Support\Facades\Storage;
use Doctrine\DBAL\Driver\Mysqli\MysqliException;

class InvoiceController extends Controller
{

    protected $dbHelper;
    protected $invoiceHelper;
    protected $invoiceService;
    protected $paystubService;
    protected $session;

	/**
	 * Middleware and helpers wiring
	 *
	 * @param InvoiceHelper $_invoiceHelper
	 * @param InvoiceService $invoice_service
	 */
	public function __construct(InvoiceHelper $_invoiceHelper, InvoiceService $invoice_service, PaystubService $paystub_service, SessionUtil $_session)
	{
		$this->middleware('auth');
		$this->invoiceHelper = $_invoiceHelper;
		$this->invoiceService = $invoice_service;
        $this->paystubService = $paystub_service;
        $this->session = $_session;
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
	
	/**
	 * Replaces index()
	 */
	public function getInvoicePageResources()
	{
		$emps = Employee::active()->hideFromPayroll()->orderByName()->get();
		$vendors = Vendor::active()->get();
		$wedArr = [];

		for($i = 0; $i < 6; $i++){
			$dt = Carbon::parse('this wednesday');
			$tmpDt = $dt->addWeek($i);
			$wedArr[] = $tmpDt->format('m-d-Y');
		}

		return response()->json([
			'agents' => $emps, 
			'issueDates' => $wedArr, 
			'vendors' => $vendors
		]);
	}
	
	/**
	 * Replaces editinvoice()
	 */
	public function getExistingInvoice($agentID, $vendorID, $issueDate)
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

	public function HandleEditInvoice(Request $request)
	{
		if(!request()->ajax()) return response()->json(false);

		$input = json_decode($request->all()['input'], true);
		$result = $this->invoiceService->editInvoice($input);
		
		return response()->json($result);
	}


	/**
	 * Save invoice via ajax --- new module
	 * @deprecated 
	 */
	public function SaveInvoice(Request $request)
	{
		if(!request()->ajax())
			return response()->json(false);

		$input = json_decode($request->all()['input'], true);
		$result = $this->invoiceService->saveInvoice($input);

		return response()->json($result);
    }
    
    /**
     * Replaces UploadInvoice()
     */
    public function saveApiInvoice(Request $request) 
    {
        $vendor_id = $request['vendorId'];
        $agent_id = $request['agentId'];
        $issue_date = $request['issueDate'];
        $week_ending = $request['weekending'];
        
        // $is_existing_invoice = $this->invoiceHelper->checkForExistingInvoice($agent_id, $vendor_id, $issue_date);
        
        // if ($is_existing_invoice) 
        // {
        //     return response('Invoice already exists.', 400);
        // }
        
        $salesTotal = array_reduce($request['sales'], function ($a, $b) {
            $a['amount'] = $a['amount'] + $b['amount'];
            return $a;
        })['amount'];
        
        $overridesTotal = array_reduce($request['overrides'], function ($a, $b) {
            $a['total'] = $a['total'] + $b['total'];
            return $a;
        })['total'];
        
        $expensesTotal = array_reduce($request['expenses'], function ($a, $b) {
            $a['amount'] = $a['amount'] + $b['amount'];
            return $a;
        })['amount'];
        
        $totals = [
            'sales' => $salesTotal,
            'overrides' => $overridesTotal,
            'expenses' => $expensesTotal
        ];
        $pending = $this->mapToPendingInvoice($request, $vendor_id, $agent_id, $issue_date, $week_ending, $totals);
        
        DB::beginTransaction();
		try {
			DB::table('invoices')->updateOrInsert($pending['sales']);
            DB::table('overrides')->updateOrInsert($pending['overrides']);
            DB::table('expenses')->updateOrInsert($pending['expenses']);
            DB::table('payroll')->insertOrIgnore($pending['payroll']);
			DB::commit();
		}
		catch(Exception $e)
		{
            DB::rollback();
            
            return response('Failed to save the invoice, please make sure you haven\'t created an invoice already.', 400);
        }
        
        $this->paystubService->processPaystubJob($issue_date);
        
        return response()->json($pending);
    }
    
    /**
     * Maps request into sql entities.
     */
    private function mapToPendingInvoice(Request $request, $vendor_id, $agent_id, $issue_date, $week_ending, $totals)
    {
        $now = Carbon::now()->format('Y-m-d H:i:s');
        
        $pending_sales = array_map(function ($sale) use ($agent_id, $issue_date, $week_ending, $vendor_id, $now) {
            return [
                'vendor' => $vendor_id, 
                'sale_date' => Carbon::parse($sale['saleDate'])->format('Y-m-d'),
                'first_name' => $sale['firstName'],
                'last_name' => $sale['lastName'],
                'address' => $sale['address'],
                'city' => $sale['city'],
                'status' => $sale['status'],
                'amount' => $sale['amount'],
                'agentid' => $agent_id,
                'issue_date' => $issue_date,
                'wkending' => $week_ending,
                'created_at' => $now,
                'updated_at' => $now
            ];
        }, $request['sales']); 
        
        $pending_overrides = array_map(function ($ovr) use ($vendor_id, $agent_id, $issue_date, $week_ending, $now) {
            return [
                'vendor_id' => $vendor_id,
                'name' => $ovr['name'],
                'sales' => $ovr['sales'],
                'commission' => $ovr['commission'],
                'total' => $ovr['total'],
                'agentid' => $agent_id,
                'issue_date' => $issue_date,
                'wkending' => $week_ending,
                'created_at' => $now,
                'updated_at' => $now
            ];
        }, $request['overrides']);
        
        $pending_expenses = array_map(function ($exp) use ($vendor_id, $agent_id, $issue_date, $week_ending, $now) {
            return [
                'vendor_id' => $vendor_id,
                'type' => $exp['type'],
                'amount' => $exp['amount'],
                'notes' => $exp['notes'],
                'agentid' => $agent_id,
                'issue_date' => $issue_date,
                'wkending' => $week_ending,
                'created_at' => $now,
                'updated_at' => $now
            ];
        }, $request['expenses']);
        
        $paystub_total = $totals['sales'] + $totals['overrides'] + $totals['expenses'];
        $agent = Employee::find($agent_id);
        
        $pending_payroll = [
            'agent_id' => $agent_id,
            'agent_name' => $agent->name,
            'amount' => $paystub_total,
            'is_paid' => 0,
            'vendor_id' => $vendor_id,
            'pay_date' => $issue_date,
            'created_at' => $now,
            'updated_at' => $now
        ];
        
        return [
            'sales' => $pending_sales,
            'overrides' => $pending_overrides,
            'expenses' => $pending_expenses,
            'payroll' => $pending_payroll
        ];
    }


	/**
	 * Upload invoice from handsontable
	 *
	 * @param Request $request
	 *
	 * @return \Illuminate\Http\JsonResponse
	 * @throws \Illuminate\Support\Facades\Exception
     * @deprecated
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

		// if the vendor id isn't properly set, we will just bail out and make the user try again.
		if($vendorId < 1) return response()->json(false, 500);

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
            if ($admin)
            {
				$dates[] = date('m-d-Y', strtotime($date));
            } 
            else 
            {
                $date = $dt->issue_date;
                $today = strtotime('today');
                $nextMon = strtotime('next wednesday 20:00 -1 day');
                $issueDt = strtotime($date);
                
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

		return view('invoices.edit',
			['data' => json_encode(['invoices' => $invoices,
			'employee' => $employee,
			'campaign' => $campaign,
			'overrides' => $overrides,
			'expenses' => $expenses,
			'issueDate' => $issueDate,
			'weekending' => $weekEnding])]);
	}


	function formatDateCollectionSeparators($date, $currentFormat, $desiredFormat)
	{
		return Carbon::createFromFormat($currentFormat, $date)->format($desiredFormat);
    }
    
    public function getPaystubs(Request $request, $employeeId, $vendorId, $issueDate)
    {
        $result = new OpResult();

        $user = $request->user()->employee;
        $this->invoiceHelper->hasAccessToEmployee($user, $employeeId)->mergeInto($result);

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
		if ($isAdmin)
		{
			$agents = Employee::active()->hideFromPayroll()->orderByName()->get();
		}
		// This employee is a manager
		else if ($isManager)
		{
			$agents = $this->session->getUserSubordinates($sessionUser->id);
            
			if($issueDates->isNotEmpty())
			{
				$today = Carbon::now()->tz('America/Detroit');

				foreach($issueDates as $key => &$issueDate)
				{
					$issueDate = Carbon::createFromFormat('Y-m-d', $issueDate);
					$nextWednesday = new Carbon('next wednesday');
					if($issueDate > $nextWednesday) {
						unset($issueDates[$key]);
						// $issueDates = $issueDates->slice(1);
						// $issueDates = array_values((array)$issueDates);
					}
					else
					{
						$nextIssue = Carbon::createFromFormat('Y-m-d', $issueDates[$key]);
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
            $agents = collect([$sessionUser]);
			$issueDates = Paystub::latest('issue_date')->agentId($sessionUser->id)
                                    ->get()->unique('issue_date')->pluck('issue_date');

			if($issueDates->isNotEmpty())
			{
				$today = Carbon::now();

				foreach($issueDates as $key => &$issueDate)
				{
					$issueDate = Carbon::createFromFormat('Y-m-d', $issueDate);
					$nextWednesday = new Carbon('next wednesday');
					if($issueDate > $nextWednesday) {
						unset($issueDates[$key]);
						// $issueDates = $issueDates->slice(1);
						// $issueDates = array_values((array)$issueDates);
					}
					else
					{
						$nextIssue = Carbon::createFromFormat('Y-m-d', $issueDates[$key]);
						$release = $nextIssue->subDay()->setTime($limit->hour, $limit->minute, 0);
	
						if($today < $release)
						{
							unset($issueDates[$key]);
							// $issueDates = $issueDates->slice(1);
						}
					}
				}
            }
            

            $invoiceVendors = Invoice::latest('issue_date')->agentId($sessionUser->id)->get()
                ->unique('vendor')->pluck('vendor');
                
            $vendors = $vendors->whereIn('id', $invoiceVendors);
		}
        
        $u = new Utilities();
        $viewData = [
            'isAdmin' => $isAdmin,
            'isManager' => $isManager,
            'emps' => json_encode($u->encodeJson($agents)),
            'issueDates' => json_encode($u->encodeJson($issueDates)),
            'vendors' => json_encode($u->encodeJson($vendors)),
            'vendorDictionary' => json_encode($u->encodeJson($vendorDictionary))
        ];

		return view('paystubs.paystubs', $viewData);
	}


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

        $params = $request->all()['inputParams'];
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
        $issueDate = $date->format('Y-m-d');
		$stubs = Invoice::agentId($agentId)->vendorId($vendorId)->issueDate($date->format('Y-m-d'))->get();
		$emp = Employee::find($agentId);
        $vendorName = Vendor::find($vendorId)->name;
        
        /**
         * At this point, the user MUST have at least one paystub... if they don't, this means that someone deleted 
         * the one record they did have and it needs to be recreated for the pages to work properly. 
         */
        if (count($stubs) < 1 || is_null($stubs)) 
        {
            $this->invoiceService->insertBlankStub($agentId, $vendorId, $date);
        }

		foreach($stubs as $s)
		{
			if(is_numeric($s->amount))
			{
				$gross = $gross + $s->amount;
			}

			$s->sale_date = strtotime($s->sale_date);
			$s->sale_date = date('m-d-Y', $s->sale_date);
        }

		$overrides = Override::agentId($agentId)->vendorId($vendorId)->issueDate($issueDate)->get();
        $expenses = Expense::agentId($agentId)->vendorId($vendorId)->issueDate($issueDate)->get();

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
    
    public function showPaystubDetailByPaystubId(Request $request, $employeeId, $paystubId)
    {
        $result = new OpResult();

        $user = $request->user()->employee;
        $this->invoiceHelper->hasAccessToEmployee($user, $employeeId)->mergeInto($result);

        if ($result->hasError()) 
        {
            return $result->getResponse();
        }

        $paystub = Paystub::find($paystubId);

        if (is_null($paystub)) 
        {
            return $result
                ->setToFail('Failed to find specified paystub.')
                ->getResponse();   
        }

        $issueDate = Carbon::createFromFormat('Y-m-d', $paystub->issue_date);

        return $this->invoiceService->getPaystubView($employeeId, $paystub->vendor_id, $issueDate);
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
        
        $pdf = PDF::loadView('pdf.template', [
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
        ]);

		return $pdf->stream($path);
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

        $pdf = PDF::loadHTML($html);

        $path = strtolower(str_replace(' ', '', Auth::user()->employee->name)) . '_' . strtotime(Carbon::now());
        $stream = $pdf->output($path);

		return view('pdf.template', ['html' => $stream]);
	}


	public function deletePaystubPdf(Request $request)
	{
		if(!$request->ajax()){
            return response()->json(false);
		}
		else
		{
			$pdf = $request->all()['pdf'];
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
