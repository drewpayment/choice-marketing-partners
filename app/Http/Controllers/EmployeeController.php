<?php

namespace App\Http\Controllers;

use App\Employee;
use App\Http\Results\OpResult;
use App\Services\EmployeeService;
use App\Services\SessionUtil;
use App\User;
use Illuminate\Contracts\Routing\ResponseFactory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Input;
use Illuminate\Support\Facades\Log;
use Illuminate\View\View;

class EmployeeController extends Controller
{

	protected $employeeService;
	protected $sessionUtil;


	/**
	 * Middleware
	 */
	public function __construct(EmployeeService $employee_service, SessionUtil $session_util)
	{
		$this->middleware('auth');

		$this->employeeService = $employee_service;
		$this->sessionUtil = $session_util;
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

		if ($request->ajax()) {
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
		if ($isActive == 'true') {
			User::userId($userId)->first()->delete();
		} else {
			User::withTrashed()->userId($userId)->first()->restore();
		}
	}


	/**
	 * @return View
	 */
	public function index(): View
	{
		$employees = Employee::active()->get()->sortBy('name');

		return view('employees.index', ['employees' => $employees]);
	}


	/**
	 * Refresh employee row data.
	 *
	 * @param Request $request
	 *
	 * @return \Illuminate\Contracts\View\Factory|View
	 *
	 */
	public function refreshEmployeeRowData(Request $request)
	{
		if (!$this->validateAjaxCall($request)['success']) return response()->json(false);

		$all = $request->all()['showAll'];

		if ($all == 'true') {
			$employees = Employee::showAll()->get()->sortBy('name');
		} else {
			$employees = Employee::active()->get()->sortBy('name');
		}

		return view('employees.partials._employeetablerowdata', ['employees' => $employees]);
	}


	/**
	 * Gets employee by id and displays information on modal. Needs to be injected into modal div and
	 * Bootstrap modal method called to show it.
	 *
	 * @param Request $request
	 *
	 * @return \Illuminate\Contracts\View\Factory|\Illuminate\Http\JsonResponse|View
	 */
	public function getExistingEmployee(Request $request)
	{
		if (!$request->ajax()) return response()->json(false);
		$employee = Employee::find($request->all()['id']);

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
		$success = false;
		if (!$this->validateAjaxCall($request)['success']) return response()->json(false);

		$ee = Employee::agentId($request->id)->first();
		$hasChanges = false;

		if ($ee->name != $request->name) {
			$ee->name = $request->name;
			$hasChanges = true;
		}
		if ($ee->email != $request->email) {
			$ee->email = $request->email;
			$hasChanges = true;
		}
		if ($ee->phone_no != $request->phoneNo) {
			$ee->phone_no = $request->phoneNo;
			$hasChanges = true;
		}
		if ($ee->address != $request->address) {
			$ee->address = $request->address;
			$hasChanges = true;
		}
		if ($ee->is_mgr != $request->isMgr) {
			$ee->is_mgr = $request->isMgr;
			$hasChanges = true;
		}
		if ($ee->sales_id1 != $request->salesId1) {
			$ee->sales_id1 = $request->salesId1;
			$hasChanges = true;
		}
		if ($ee->sales_id2 != $request->salesId2) {
			$ee->sales_id2 = $request->salesId2;
			$hasChanges = true;
		}
		if ($ee->sales_id3 != $request->salesId3) {
			$ee->sales_id3 = $request->salesId3;
			$hasChanges = true;
		}

		if ($hasChanges)
			$success = $ee->save();

		if (!$success) return response()->json(false, 500);

		$user = User::where('id', $ee->id)->first();

		if ($user->email != $ee->email) {
			$user->email = $ee->email;
			$success = $user->save();
		}

		return response()->json($success, $success ? 200 : 500);
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
		if (!$this->validateAjaxCall($request)['success']) return response()->json(false, 500);

		$params = $request->all();
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
		} catch (\mysqli_sql_exception $e) {
			DB::rollback();
			$errors[] = $e;
		}

		if (count($errors) > 0) return response()->json($errors, 500);

		$newEmpId = $e->id;

		$randomPass = substr(str_shuffle("abcdefghijklmnopqrstuvwxyz01234567890"), 0, 8);

		$user = new User();
		$user->id = $e->id;
		$user->name = $e->name;
		$user->email = $e->email;
		$user->password = bcrypt($randomPass);

		DB::beginTransaction();
		try {
			$user->save();
			DB::commit();
		} catch (\mysqli_sql_exception $err) {
			DB::rollback();
			$errors[] = $err;
		}

		if (count($errors) > 0) return response()->json($errors, 500);

		return response()->json(true);
	}


	public function updateEmployeeActiveStatus(Request $request)
	{
		$errors = [];
		if (!$this->validateAjaxCall($request)['success']) return response()->json(false, 500);

		$params = $request->all();
		$e = Employee::agentId($params['id'])->first();
		$activeStatus = ($params['active'] == 'true') ? 1 : 0;
		$e->is_active = $activeStatus;

		DB::beginTransaction();
		try {
			$e->save();
			DB::commit();
		} catch (\mysqli_sql_exception $err) {
			DB::rollback();
			$errors[] = $err;
		}

		if (count($errors) > 0) return response()->json($errors, 500);

		$this->updateUserRecord($e->id, $activeStatus);


		return response()->json(true);
	}

	/**
	 * URL: /ng/agents
	 * Description:
	 * Search for agents with paging, returns json for Angular.
	 *
	 * @param Request $request
	 *
	 * @return JsonResponse
	 */
	public function getAgents(Request $request): JsonResponse
	{
		$result = new OpResult();

		$user = auth()->user();
		$isAdmin = $user->employee->is_admin;

		if (!$isAdmin)
			return $result->setToFail('Unauthorized.')->getResponse();

		$showAll = strtolower($request->query('showall')) === 'true';
		$size = $request->query('size', 10);
		$page = $request->query('page');
		$search = $request->query('q');

		return $result->trySetData(function ($showAll, $size, $page) use (&$search) {
			$qry = Employee::with('user.notifications')
				->whereNotIn('id', [5, 6]) //TODO: hack in place to keep Terri/Chris from showing up on agents list until user-types are released
				->whereLike('name', $search)
				->orderBy('name');

			return $showAll
				? $qry->showAll()->paginate($size, ['*'], 'page', $page)
				: $qry->active()->paginate($size, ['*'], 'page', $page);
		}, ['showAll' => $showAll, 'size' => $size, 'page' => $page])->getResponse();
	}

	public function updateAgent(Request $req)
	{
		$result = new OpResult();

		$user = auth()->user();
		$isAdmin = $user->employee->is_admin;

		if (!$isAdmin)
			return $result->setToFail('Unauthorized.')->getResponse();

		$employeeId = intval($req->id);

		if ($employeeId < 1)
			return $result->setToFail('Unable to find a valid employee.')->getResponse();

		$employee = Employee::find($employeeId);

		$data = $this->sessionUtil->fromCamelCase($req->all());

		$employee->name = $data['name'];
		$employee->email = $data['email'];
		$employee->phone_no = $data['phone_no'];
		$employee->address = $data['address'];
		$employee->address_2 = $data['address_2'];
		$employee->city = $data['city'];
		$employee->state = $data['state']['StateName'];
		$employee->country = $data['country']['CountryName'];
		$employee->postal_code = $data['postal_code'];
		$employee->is_mgr = $data['is_manager'];
		$employee->sales_id1 = $data['id_1'];
		$employee->sales_id2 = $data['id_2'];
		$employee->sales_id3 = $data['id_3'];
		$employee->has_been_fixed = true;

		$saved = $employee->save();

		if (!$saved)
			return $result
				->setToFail('Failed to save the updated employee.')
				->getResponse();

		return $result->setData($employee)->getResponse();
	}

	public function createAgent(Request $request)
	{
		$result = new OpResult();

		$user = auth()->user();
		$isAdmin = $user->employee->is_admin;

		if (!$isAdmin)
			return $result->setToFail('Unauthorized.')->getResponse();

		$employee = new Employee([
			'name' => $request->name,
			'email' => $request->email,
			'phone_no' => $request->phoneNo,
			'address' => $request->address,
			'address_2' => $request->address2,
			'city' => $request->city,
			'state' => $request->state,
			'country' => $request->country,
			'is_active' => true,
			'is_admin' => false,
			'sales_id1' => $request->salesId1,
			'sales_id2' => $request->salesId2,
			'sales_id3' => $request->salesId3,
			'hidden_payroll' => false
		]);

		$useSalesIdPW = $request->salesId1 != null;

		DB::beginTransaction();
		try {
			$saved = $employee->save();

			if (!$saved)
				return $result->setToFail('Agent save failed.')->getResponse();

			$dto = [
				'agent' => $employee
			];

			if (boolval($request->isCreatingUser)) {
				$user = new User([
					'id' => $employee->id,
					'name' => $request->name,
					'user_type' => $request->userType,
					'email' => $request->email
				]);

				if (is_null($request->password) && $useSalesIdPW) {
					$user->password = bcrypt($request->salesId1);
				} else if (is_null($request->password)) {
					$random = str_random(10);
					$user->password = bcrypt($random);
				} else {
					$user->password = bcrypt($request->password);
				}

				$userSaved = $user->save();

				if (!$userSaved)
					return $result->setToFail('Agent saved, but failed to save user.')->getResponse();

				$dto['user'] = $user;
			}

			DB::commit();
		} catch (\Exception $e) {
			Log::error($e);
			DB::rollback();

			return $result->setToFail($e->getMessage())->getResponse();
		}

		return $result->setData($dto)->getResponse();
	}

	public function deleteAgent(Request $request)
	{
		$result = new OpResult();

		$emp = Employee::withTrashed()->where('id', '=', $request->id)->first();
		$emp->is_active = false;
		$emp->save();
		$deleted = $emp->delete() > 0;
		// $deleted = Employee::destroy($request->id) > 0;

		if (!$deleted) $result->setToFail('Failed to disable the agent.');

		return $result->getResponse();
	}

	/**
	 * @param Request $request
	 *
	 * @return JsonResponse
	 */
	public function restoreAgent(Request $request): JsonResponse
	{
		$result = new OpResult();

		$emp = Employee::withTrashed()->byEmployeeId($request->id)->first();
		$restored = $emp->restore();

		if (!$restored) $result->setToFail('Failed to restore agent.');

		$emp->is_active = true;
		$saved = $emp->save();

		if (!$saved) $result->setToFail('Employee was restored, but failed to update the "Active" status.');

		$empUser = User::onlyTrashed()->byEmployeeId($emp->id)->first();

		if ($empUser != null) {
			$empUser->restore();
		}

		return $result->getResponse();
	}

	/**
	 * Admins make a call to this endpoint from Angular to reset an employee's password.
	 *
	 * @param Request $request
	 * @return void
	 */
	public function resetPassword(Request $request)
	{
		$result = new OpResult();

		$this->sessionUtil->checkUserIsAdmin()->mergeInto($result);

		if ($result->hasError())
			return $result->getResponse();

		$user = User::byEmployeeId($request->id)->first();

		if ($user == null) {
			return $result->setToFail('Could not find the specified agent.')
				->getResponse();
		}

		$user->password = bcrypt($request->password);

		$saved = $user->save();

		if (!$saved) $result->setTofail('Changing passwords failed.');

		return $result->getResponse();
	}

	#region API Endpoints

	/**
	 * @param Request $request
	 *
	 * @return JsonResponse
	 */
	public function checkEmailAvailability(Request $request): JsonResponse
	{
		$result = new OpResult();

		$this->sessionUtil->checkUserIsAdmin()->mergeInto($result);

		if ($result->hasError()) return $result->getResponse();

		$email = $request->input('email');

		if (is_null($email)) {
			return $result->setToFail('Email is required')->getResponse();
		}

		$user = User::withTrashed()->where('email', $email)->first();

		if ($user == null) {
			return $result->getResponse();
		}

		$result->setToFail('Found existing user with this email address.');

		return $result->getResponse();
	}

	#endregion

}
