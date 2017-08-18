<?php

namespace App\Http\Controllers;

use App\Employee;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class EmployeeController extends Controller
{
	/**
	 * Middleware
	 */
	public function __construct()
	{
		$this->middleware('auth');
	}

	/**
	 * @return \Illuminate\Contracts\View\Factory|\Illuminate\View\View
	 */
	public function index()
	{
		$employees = Employee::active()->get()->sortBy('name');

		return view('employees.index', ['employees' => $employees]);
	}

	public function store(Request $request)
	{
		$employee = new Employee();
		$employee->name = $request->name;
		$employee->email = $request->email;
		$employee->phone_no = $request->phone_no;
		$employee->address = $request->address;
		$employee->sales_id1 = $request->sales_id1;
		$employee->sales_id2 = $request->sales_id2;
		$employee->sales_id3 = $request->sales_id3;
		$employee->is_active = 1;

		DB::beginTransaction();
		try {
			$employee->save();
			$msg = 'Success!';
			$status = 200;
			DB::commit();
		} catch (\mysqli_sql_exception $e) {
			$msg = 'Error! '.$e;
			$status = 500;
			DB::rollback();
		}

		return response()->json($msg, $status);
	}
}
