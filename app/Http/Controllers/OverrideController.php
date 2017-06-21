<?php

namespace App\Http\Controllers;

use App\Employee;
use App\Override;
use App\Permission;
use Illuminate\Http\Request;

use App\Http\Requests;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Input;

class OverrideController extends Controller
{
	/**
	 * Middleware
	 */
	public function __construct()
	{
		$this->middleware('auth');
	}

	public function OverrideController(Request $request)
	{

		$override = new Override;

		return response()->json($request);

	}


	/*
	 * url: /overrides
	 *
	 *
	 *
	 */
	public function overrides()
	{
		$managers = Employee::where('is_mgr', 1)->get();

		return view('overrides.overrides', ['managers' => $managers]);
	}


	public function detail($id)
	{
		$employees = Employee::all();
		$manager = Employee::find($id);
		$permissions = Employee::find($id)->permissions;
		$children = [];

		foreach($permissions as $p)
		{
			$children[] = $employees->first(function($val, $key) use ($p){
				return $val->id == $p->emp_id;
			});
		}

		return view('overrides.detail', ['manager' => $manager, 'children' => $children, 'employees' => $employees]);
	}


	public function refreshDetail($id)
	{
		$employees = Employee::all();
		$permissions = Employee::find($id)->permissions;
		$children = [];

		foreach($permissions as $p)
		{
			$children[] = $employees->first(function($val, $key) use ($p){
				return $val->id == $p->emp_id;
			});
		}

		return view('overrides._detailRowData', ['children' => $children]);
	}


	/*
	 * when user selects an agent on the override management view,
	 * it will get the employee they click and load a confirmation modal to verify this agent
	 * should be added to the manager that the user is currently viewing.
	 *
	 * @return html
	 *
	 */
	public function returnAddAgentConfirmModal($id)
	{
		$agent = Employee::find($id);

		return view('overrides.confirm_add', ['agent' => $agent]);
	}


	public function returnDeleteAgentConfirmModal($id)
	{
		$agent = Employee::find($id);

		return view('overrides.confirm_delete', ['agent' => $agent]);
	}


	public function handleAddAgentOverride(Request $request)
	{
		if(request()->ajax())
		{
			$agent = Input::get('agentId');
			$mgr = Input::get('mgrId');

			$permission = Permission::where('emp_id', $agent)->first();
			$manager = Employee::find($mgr);

			try{
				DB::beginTransaction();

				$manager->permissions()->attach($permission);
				DB::commit();

				return response()->json(true);
			} catch(\Exception $e){

				DB::rollback();

				return response()->json(false);
			}
		} else {

			return response()->json(false);

		}
	}


	public function handleDeleteAgentOverride(Request $request)
	{
		if(request()->ajax())
		{
			$agent = Input::get('agentId');
			$mgr = Input::get('mgrId');

			$permission = Permission::where('emp_id', $agent)->first();
			$manager = Employee::find($mgr);

			try{
				DB::beginTransaction();

				$manager->permissions()->detach($permission);
				DB::commit();

				return response()->json(true);
			} catch (\Exception $e) {

				DB::rollback();

				return response()->json(false);
			}
		} else {
			return response()->json(false);
		}
	}

}
