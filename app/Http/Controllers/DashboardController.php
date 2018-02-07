<?php

namespace App\Http\Controllers;

use App\Employee;
use App\Payroll;
use App\PayrollRestriction;
use App\Paystub;
use App\Services\PaystubService;
use App\Vendor;
use App\User;
use Carbon\Carbon;
use Exception;
use Illuminate\Http\Request;

use App\Http\Requests;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Input;

class DashboardController extends Controller
{

	protected $paystubService;

	/**
	 * Middleware --- THIS IS AN ADMIN ONLY PAGE
	 *
	 * @param $PAYSTUB_SERVICE
	 */
	public function __construct(PaystubService $PAYSTUB_SERVICE)
	{
		$this->middleware('auth');
		$this->paystubService = $PAYSTUB_SERVICE;
	}


	/**
	 * dashboard landing view
	 */
	public function index()
	{
		$dates = Paystub::all()->unique('issue_date');

		$dates = $dates->values()->sortByDesc(function($d) {
			return $d->issue_date;
		});

		foreach($dates as $d)
		{
			$d['display_date'] = Carbon::parse($d->issue_date)->format('m-d-Y');
		}

		return view('dashboard.dashboard', ['dates' => $dates]);
	}


	public function releaseRestriction()
	{
		$time = PayrollRestriction::find(1);

		return view('dashboard.restriction', ['time' => $time]);
	}


	/*
	 * load payroll landing page
	 *
	 */
	public function payrollInfo()
	{
		$dates = Payroll::all()->unique('pay_date')->sortBy(function($col){
			return $col->pay_date;
		}, null, true)->values()->all();
		$dates = collect($dates);
		$date = (is_null($dates->first())) ? date(strtotime('now')) : $dates->first()->pay_date;
		$vendors = Vendor::active()->get();

		$employees = Payroll::payDate($date)->vendor(-1)->paidFirst()->orderByName()->get();


		return view('dashboard.payrollinfo',
			[
				'dates' => $dates,
			    'employees' => $employees,
			    'vendors' => $vendors
			]);
	}


	public function refreshPayrollInfo(Request $request)
	{
		$date = $request->date;

		$employees = Payroll::payDate($date)->paidFirst()->orderByName()->get();

		return view('dashboard.payrollTableRowData', ['employees' => $employees]);
	}


	public function refreshPayrollTracking(Request $request)
	{
		if(!$request->ajax()) return false;

		$data = $request->all();
		$vendor = $data['vendor'];
		$date = $data['date'];

		$employees = Payroll::payDate($date)->vendor($vendor)->paidFirst()->orderByName()->get();

		$vendors = Vendor::all();

		return view('dashboard.payrollTableRowData', ['employees' => $employees, 'vendors' => $vendors]);
	}


	/*
	 * handle when user clicks "paid" checkbox on payroll info page
	 */
	public function handlePayrollClick(Request $request)
	{
		$payrollId = $request->payId;
		$isPaid = $request->isPaid;

		DB::beginTransaction();
		try{
			Payroll::payrollId($payrollId)->update(['is_paid' => $isPaid]);
			DB::commit();
		} catch(Exception $e){
			DB::rollback();
			return response()->json('false');
		}

		return response()->json('true');
	}


	public function savePaystubRestriction(Request $request)
	{
		if(!$request->ajax()) return response()->json(false, 500);
		$user = User::userId(auth()->user()->id)->first();
		if($user->employee['is_admin'] != 1) return response()->json(false, 500);

		$input = Input::all();
		$hour = $input['hour'];
		$min = $input['min'];

		$restrict = PayrollRestriction::find(1);
		$restrict->hour = $hour;
		$restrict->minute = $min;
		$restrict->modified_by = auth()->user()->id;

		DB::beginTransaction();
		try {
			$restrict->save();
			DB::commit();
		} catch (\mysqli_sql_exception $e) {
			DB::rollback();
			return response()->json(false, 500);
		}

		return response()->json(true, 200);
	}


	public function reprocessPaystubDates($date)
	{
		if(Employee::find(auth()->user()->id)->is_admin != 1) return response()->json(false, 405);

		DB::beginTransaction();
		try {
			$this->paystubService->processPaystubJob($date);
			DB::commit();
			return response()->json(true);
		} catch (\mysqli_sql_exception $e) {
			DB::rollback();
			return response()->json(false, 500);
		}

	}

}
