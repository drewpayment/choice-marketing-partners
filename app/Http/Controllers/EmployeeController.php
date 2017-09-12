<?php

namespace App\Http\Controllers;

use App\Employee;
use App\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Input;

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
	 * Returns true if request is of type ajax request.
	 * @param Request $request
	 *
	 * @return array
	 */
	public function validateAjaxCall(Request $request)
	{
		$return = [
			'success' => false,
			'message' => null
		];

		if($request->ajax()){
			$return['success'] = true;
		} else {
			$return['success'] = false;
			$return['message'] = "I'm sorry, you can only make this call via ajax.";
		}

		return $return;
	}


	/**
	 * Updates user record to reflect employee active status
	 * @param $userId
	 * @param $isActive
	 */
	public function updateUserRecord($userId, $isActive)
	{
		if($isActive == 'true')
		{
			User::userId($userId)->first()->delete();
		}
		else
		{
			User::withTrashed()->userId($userId)->first()->restore();
		}
	}


	/**
	 * @return \Illuminate\Contracts\View\Factory|\Illuminate\View\View
	 */
	public function index()
	{
		$employees = Employee::active()->get()->sortBy('name');

		return view('employees.index', ['employees' => $employees]);
	}


	/**
	 * Refresh employee row data.
	 *
	 * @param Request $request
	 *
	 * @return \Illuminate\Contracts\View\Factory|\Illuminate\View\View
	 *
	 */
	public function refreshEmployeeRowData(Request $request)
	{
		if(!$this->validateAjaxCall($request)['success']) return response()->json(false);

		$all = Input::all()['showAll'];

		if($all == 'true') {
			$employees = Employee::showAll()->get()->sortBy('name');
		} else {
			$employees = Employee::active()->get()->sortBy('name');
		}

		return view('employees.partials._employeetablerowdata', ['employees' => $employees]);
	}


	/**
	 * Gets employee by id and displays information on modal. Needs to be injected into modal div and
	 * Bootstrap modal method called to show it.
	 * @param Request $request
	 *
	 * @return \Illuminate\Contracts\View\Factory|\Illuminate\Http\JsonResponse|\Illuminate\View\View
	 */
	public function getExistingEmployee(Request $request)
	{
		if(!$request->ajax()) return response()->json(false);
		$employee = Employee::find(Input::all()['id']);

		return view('employees.partials.existingemployeemodal', ['emp' => $employee]);
	}


	/**
	 * Find employee record and update any changes from existing employee modal.
	 * @param Request $request
	 *
	 * @return \Illuminate\Http\JsonResponse
	 */
	public function updateExistingEmployee(Request $request)
	{
		$errors = [];
		if(!$this->validateAjaxCall($request)['success']) return response()->json(false);

		$params = Input::all();
		$employee = Employee::find($params['id']);
		$employee->name = $params['name'];
		$employee->email = $params['email'];
		$employee->phone_no = $params['phoneNo'];
		$employee->address = $params['address'];
		$employee->is_mgr = $params['isMgr'];
		$employee->sales_id1 = $params['salesId1'];
		$employee->sales_id2 = $params['salesId2'];
		$employee->sales_id3 = $params['salesId3'];

		DB::beginTransaction();
		try {
			$employee->save();
			DB::commit();
		} catch (\mysqli_sql_exception $e) {
			DB::rollback();
			$errors[] = $e;
		}

		if(count($errors) > 0) return response()->json($errors, 500);

		return response()->json(true);
	}


	/**
	 * Create new employee from ajax call.
	 * @param Request $request
	 *
	 * @return \Illuminate\Http\JsonResponse
	 */
	public function createNewEmployee(Request $request)
	{
		$errors = [];
		if(!$this->validateAjaxCall($request)['success']) return response()->json(false, 500);

		$params = Input::all();
		$e = new Employee([
			'name' => $params['name'],
			'email' => $params['email'],
			'phone_no' => $params['phoneNo'],
			'address' => $params['address'],
			'is_active' => 1,
			'is_mgr' => $params['isMgr'],
			'sales_id1' => $params['salesId1'],
			'sales_id2' => $params['salesId2'],
			'sales_id3' => $params['salesId3']
		]);

		DB::beginTransaction();
		try {
			$e->save();
			DB::commit();
		} catch (\mysqli_sql_exception $e){
			DB::rollback();
			$errors[] = $e;
		}

		if(count($errors) > 0) return response()->json($errors, 500);

		$randomPass = substr(str_shuffle("abcdefghijklmnopqrstuvwxyz01234567890"), 0, 8);

		$user = new User();
		$user->id = $e->id;
		$user->name = $e->name;
		$user->email = $e->email;
		$user->password = bcrypt($randomPass);

		DB::beginTransaction();
		try{
			$user->save();
			DB::commit();
		} catch (\mysqli_sql_exception $err){
			DB::rollback();
			$errors[] = $err;
		}

		if(count($errors) > 0) return response()->json($errors, 500);

		return response()->json(true);
	}


	public function updateEmployeeActiveStatus(Request $request)
	{
		$errors = [];
		if(!$this->validateAjaxCall($request)['success']) return response()->json(false, 500);

		$params = Input::all();
		$e = Employee::agentId($params['id'])->first();
		$activeStatus = ($params['active'] == 'true') ? 1 : 0;
		$e->is_active = $activeStatus;

		DB::beginTransaction();
		try {
			$e->save();
			DB::commit();
		} catch (\mysqli_sql_exception $err){
			DB::rollback();
			$errors[] = $err;
		}

		if(count($errors) > 0) return response()->json($errors, 500);

		$this->updateUserRecord($e->id, $activeStatus);


		return response()->json(true);
	}

}