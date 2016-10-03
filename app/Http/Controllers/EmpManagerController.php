<?php

namespace App\Http\Controllers;

use App\Employee;
use App\Http\Requests\EmployeeRequest;
use Illuminate\Http\Request;

use App\Http\Requests;
use Illuminate\Support\Facades\Input;

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

    	return view('emp_manager.index', ['employees' => $employees]);
    }

    /**
     * Show the form for creating a new resource.
     *
     * @return \Illuminate\Http\Response
     */
    public function create()
    {
        return view('emp_manager.create');
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
    public function update(Request $request, $id)
    {
        //
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

    /*
    * Get employees and return in json format for ajax calls
    * 
    * @return JSON
    */
    public function getemployees()
    {
        $emps = Employee::all();
        $view = View::make('emp_manager._emp', ['employees' => $emp]);
        $html = $view->render();

        return response()->json($html);
    }
}
