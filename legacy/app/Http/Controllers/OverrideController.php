<?php

namespace App\Http\Controllers;

use App\Employee;
use App\Override;
use App\Services\OverrideService;
use Illuminate\Http\Request;

use App\Http\Requests;
use App\Http\Results\OpResult;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Input;

class OverrideController extends Controller
{

	/**
	 *
	 *
	 * @var OverrideService
	 */
	protected $OverrideService;

	/**
	 * Middleware
	 *
	 * @param OverrideService $override_service
	 */
	public function __construct(OverrideService $override_service)
	{
		$this->middleware('auth');

		$this->OverrideService = $override_service;
	}

	public function OverrideController(Request $request)
	{

		$override = new Override;

		return response()->json($request);

	}


	/*
	 * url: /overrides
	 *
	 * Shows all currently active managers
	 *
	 */
	public function overrides()
	{
		$managers = Employee::managersOnly(true)->active()->get();

		return view('overrides.overrides', ['managers' => $managers]);
	}


	public function detail($id)
	{
		$employees = Employee::where('is_mgr', 0)->where('is_admin', 0)->active()->get();
		$manager = Employee::find($id);

		$children = $this->OverrideService->GetEmployeesByManagerId($id);

		return view('overrides.detail', ['manager' => $manager, 'children' => $children, 'employees' => $employees]);
	}


	public function refreshDetail($id)
	{
		$children = $this->OverrideService->GetEmployeesByManagerId($id);

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
		if(!request()->ajax())
			return response()->json(false);

        $agent = $request->get('agentId');
        $mgr = $request->get('mgrId');

		$result = $this->OverrideService->AddEmployeeOverride($agent, $mgr);

		return response()->json($result);
	}


	public function handleDeleteAgentOverride(Request $request)
	{
		if(!request()->ajax())
			return response()->json(false);

        $agent = $request->get('agentId');
        $mgr = $request->get('mgrId');

		$result = $this->OverrideService->DeleteEmployeeOverride($agent, $mgr);

		return response()->json($result);
	}

}
