<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

use App\Http\Requests;
use Illuminate\Support\Facades\DB;

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
		$dates = DB::table('invoices')
			->select('issue_date')
			->groupBy('issue_date')->get();
//		$sales = DB::table('invoices')
//						->select(DB::raw('count(*) as saleCount'))
//						->groupBy('issue_date')->get();

		$acceptedSales = DB::table('invoices')
						->select('issue_date', DB::raw('count(*) as saleCount'))
						->where('status', "Accepted")
						->groupBy('issue_date')
						->get();

		$rejectedSales = DB::table('invoices')
		             ->select('issue_date', DB::raw('count(*) as saleCount'))
		             ->where('status', "Rejected")
		             ->groupBy('issue_date')
		             ->get();

		$chargebacks = DB::table('invoices')
		                 ->select('issue_date', DB::raw('count(*) as saleCount'))
		                 ->where('status', "Chargeback")
		                 ->groupBy('issue_date')
		                 ->get();

		$uncategorized = DB::table('invoices')
		                   ->select('issue_date', DB::raw('count(*) as saleCount'))
		                   ->where('status', "")
		                   ->groupBy('issue_date')
		                   ->get();

		$jsdata = array('xAxis' => $dates, 'accepted' => $acceptedSales, 'rejects' => $rejectedSales, 'chargebacks' => $chargebacks, 'uncategorized' => $uncategorized);
		$jsdata = json_encode($jsdata);

//      this is going to be for the second graph... should return each rep and their sales by week
//		$salesByRep = DB::select('SELECT employees.name, count(*) as sales, DATE(invoices.issue_date) as issueDate
//								FROM invoices
//								JOIN employees
//								ON invoices.agentid = employees.id
//								GROUP BY issueDate, employees.id')->get();
//
//		dd($salesByRep);

		return view('dashboard.dashboard', ['jsdata' => $jsdata]);
	}

}
