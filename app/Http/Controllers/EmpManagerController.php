<?php

namespace App\Http\Controllers;

use App\Employee;
use App\Http\Requests\EmployeeRequest;
use Illuminate\Http\Request;

use App\Http\Requests;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Input;
use Illuminate\Support\Facades\View;

class EmpManagerController extends Controller
{
	/**
	 * Middleware
	 */
	public function __construct()
	{
		$this->middleware('auth');
	}

	/**
     * Display a listing of the resource.
     *
     * @return \Illuminate\Http\Response
     */
    public function index()
    {
        $employees = Employee::where('is_active', 1)->get();
        $employees = $employees->sortBy('name');

    	return view('emp_manager.index', ['employees' => $employees]);
    }

    /**
     * Show the form for creating a new resource.
     *
     * @return \Illuminate\Http\Response
     */
    public function create()
    {
        return view('emp_manager._create')->render();
    }

    /**
     * Store a newly created resource in storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\Response
     */
    public function store(Request $request)
    {
        $employee = new Employee();
	    $employee->name = $request->name;
	    $employee->email = $request->email;
	    $employee->phone_no = $request->phone_no;
	    $employee->address = $request->address;
	    $employee->is_active = 1;

        $result = $employee->save();

        if($result)
        {
            return redirect()->back()->with('message', 'Success! You have stored a new employee.');
        }
        else 
        {
            return redirect()->back()->with('alert', 'Sorry! Something went bad and we weren\'t able to add your employee.');
        }

	    
    }


    public function handleAddNewEmployee(Request $request)
    {
    	$data = $request["data"];
    	$emp = new Employee();
    	$emp->name = $data["name"];
		$emp->email = $data["email"];
		$emp->phone_no = $data["phone"];
		$emp->address = $data["address"];
		$emp->is_active = ($data["isactive"]) ? 1 : 0;

    	$empTable = $emp->save();
    	$id = Employee::where('name', $data["name"])->first()->id;

    	$password = password_hash('Password1', PASSWORD_BCRYPT);

    	$userId = DB::table('users')->insertGetId(
		    ['id' => $id, 'name' => $data["name"], 'email' => $data["email"], 'password' => $password, 'created_at' => date('Ymd'), 'updated_at' => date('Ymd')]
	    );

    	if($empTable == true && $userId > 0){
    		$result = true;
	    } else {
    		$result = false;
	    }

    	return response()->json($result);
    }


    /**
     * Display the specified resource.
     *
     * @param  int  $id
     * @return \Illuminate\Http\Response
     */
    public function show($id)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     *
     * @param  int  $id
     * @return \Illuminate\Http\Response
     */
    public function edit($id)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  int  $id
     * @return \Illuminate\Http\Response
     */
    public function update(Request $request)
    {
        $data = $request['data'];
        $emp = new Employee();

        foreach($data as $key => $val){
        	if($key != "tag" && $key != "token"){
		        $emp[$key] = $val;
	        }
        }

        try {
	        DB::table('employees')
	          ->where('id', $data['id'])
	          ->update($emp->toArray());
        } catch(\mysqli_sql_exception $e){
            return response()->json(false);
        }



    	return response()->json(true);
    }

    /**
     * Remove the specified resource from storage.
     *
     * @param  int  $id
     * @return \Illuminate\Http\Response
     */
    public function destroy($id)
    {
        //
    }

	public function refreshEmployeeRowData(Request $request)
	{
		$isactive = $request['showall'];

		$isactive = ($isactive == "true") ? 0 : 1;

		if($isactive == 0){
			$emps = DB::table('employees')->get();
		} else {
			$emps = DB::table('employees')
			          ->where('is_active', '=', 1)
				      ->orderBy('name', 'asc')
			          ->get();
		}

		return view('emp_manager._emp', ['employees' => $emps]);
	}


	public function returnEmployeeRowData(Request $request)
	{
		$showall = $request['showall'];

		$showall = ($showall == 'true') ? 0 : 1;

		if($showall == 0){
			$emps = DB::table('employees')->get();
		} else {
			$emps = DB::table('employees')
			          ->where('is_active', '=', 1)
			          ->orderBy('name', 'asc')
			          ->get();
		}

		return view('emp_manager._emp', ['employees' => $emps]);
	}


	public function updateEmployeeSalesID(Request $request)
	{
		$object = json_decode($request["data"]);
		$userId = $object->userId;
		$salesId = $object->salesId;
		$value = $object->value;
		$result = DB::table('employees')
			->where('id', '=', $userId)
			->update([$salesId => $value]);

		$result = ($result == 1) ? true : false;

		return response()->json($result);
	}


    /*
    * Get employees and return in json format for ajax calls
    * 
    * @return JSON
    */
    public function getemployees()
    {
        $emps = Employee::all()->get();
        $emps = $emps->sortBy('name');
        $view = View::make('emp_manager._emp', ['employees' => $emps]);
        $html = $view->render();

        return response()->json($html);
    }

    /*
    * return edit employee modal 
    *
    */
    public function getEmployeeEditModal()
    {
        if(request()->ajax())
        {
            $data = request()->all();
        }
        $emp = Employee::where('id', '=', $data['id'])->get();

        return view('emp_manager._emp_modal', ['emp' => $emp])->render();
    }


	// Function for basic field validation (present and neither empty nor only white space
	function IsNullOrEmptyString($question){
		return (!isset($question) || trim($question)==='');
	}
}
