<?php

namespace App\Http\Controllers;

use App\Payroll;
use App\PayrollRestriction;
use App\Vendor;
use Exception;
use Illuminate\Http\Request;

use App\Http\Requests;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Input;

class DashboardController extends Controller
{

	/**
	 * Middleware --- THIS IS AN ADMIN ONLY PAGE
	 */
	public function __construct()
	{
		$this->middleware('auth');
	}


	/**
	 * dashboard landing view
	 */
	public function index()
	{
		$time = PayrollRestriction::find(1);

		return view('dashboard.dashboard', ['time' => $time]);
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
		$vendors = Vendor::all();

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
		if(!$request->ajax()) response()->json(false, 500);

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

}
