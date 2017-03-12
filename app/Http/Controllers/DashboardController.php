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
		$dates = DB::table('invoices')->select('issue_date')->groupBy('issue_date')->get();
		$sales = DB::table('invoices')
						->select(DB::raw('count(*) as saleCount'))
						->groupBy('issue_date')->get();

		$jsdata = array('xAxis' => $dates, 'y1' => $sales);
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
