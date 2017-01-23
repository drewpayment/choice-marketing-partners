<?php

namespace App\Http\Controllers;

use App\Http\Requests;
use App\Invoice;
use DateTime;
use DateInterval;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class InvoiceController extends Controller
{
    /**
	 * Middleware
	 */
	public function __construct()
	{
		$this->middleware('auth');
	}


	public function index()
	{
		$emps = DB::table('employees')->get();
		$vendors = DB::table('vendors')->get();
		$wedArr = [];
		$dt = new DateTime();

		for($i = 1; $i < 4; $i++)
		{
			if($i == 1)
			{
				$dt = strtotime('next wednesday');
				$wedArr[] = date('m-d-Y', $dt);
			}
			else 
			{
				$dt = strtotime('+'. $i .' week wednesday');
				$wedArr[] = date('m-d-Y', $dt);
			}
		}


		return view('invoices.upload', ['emps' => $emps, 'weds' => $wedArr, 'vendors' => $vendors]);
	}


	/**
	 * Upload invoice from handsontable
	 */
	public function UploadInvoice(Request $request)
	{
		$invoice = new Invoice;
		$input = $request->sales;
		$array = [];

		foreach($input as $sale)
		{
			if(!empty($sale['date']))
			{
				$array[] = [
					'id' => $sale['id'],
					'vendor' => $sale['vendor'],
					'sale_date' => new DateTime($sale['date']),
					'first_name' => $sale['name']['first'],
					'last_name' => $sale['name']['last'],
					'address' => $sale['address'],
					'city' => $sale['city'],
					'status' => $sale['status'],
					'amount' => $sale['amount'],
					'agentid' => $sale['agentid'],
					'issue_date' => new DateTime($sale['issueDate']),
					'wkending' => new DateTime($sale['wkending']),
					'created_at' => new DateTime(),
					'updated_at' => new DateTime()
				];
			}
		}

		if(DB::table('invoices')->insert($array))
		{
			$result = "Your invoice was uploaded!";
		}
		else 
		{
			$result = "Utoh! Something went wrong. You might have sent some empty fields?";
		}


		return response()->json($result);
	}


	public function historical()
	{
		$emps = DB::table('employees')->get();
		$weds = [];

		return view('invoices.historical', ['emps' => $emps]);
	}


	public function returnIssueDates(Request $request)
	{
		$id = $request->id;
		$dates = [];
		$list = DB::table('invoices')
						->select('issue_date')
						->where('agentid', '=', $id)
						->groupBy('issue_date')
						->get();

		foreach($list as $dt)
		{
			$dates[] = date('m-d-Y', strtotime($dt->issue_date));
		}

		return view('invoices.issuedates', ['issuedates' => $dates]);
	}


	public function returnPaystub(Request $request)
	{
		$gross = 0;
		// $deductions => need to support this in db and admin
		$invoiceDt = strtotime($request->date);
		$invoiceDt = date('m-d-Y', $invoiceDt);
		$stubs = DB::table('invoices')
						->where('issue_date', '=', $request->date)
						->get();

		$agentid = $stubs->first()->agentid;

		$emp = DB::table('employees')
						->select('*')
						->where('id', '=', $agentid)
						->first();

		$vendorId = $stubs->first()->vendor;
		$vendorName = DB::table('vendors')
						->select('name')
						->where('id', '=', $vendorId)
						->get();
		$vendorName = $vendorName->first()->name;

		foreach($stubs as $s)
		{
			if(is_numeric($s->amount))
			{
				$gross = $gross + $s->amount;
			}

			$s->sale_date = strtotime($s->sale_date);
			$s->sale_date = date('m-d-Y', $s->sale_date);
		}


		return view('invoices.paystub', ['stubs' => $stubs, 'emp' => $emp, 'gross' => $gross, 'invoiceDt' => $invoiceDt, 'vendor' => $vendorName]);
	}


	public function OverridesModal()
	{
		return view('invoices.overridesmodal');
	}
}
