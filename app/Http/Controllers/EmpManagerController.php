<?php

namespace App\Http\Controllers;

use App\Employee;
use App\Http\Requests\EmployeeRequest;
use App\User;
use Carbon\Carbon;
use Illuminate\Http\Request;

use App\Http\Requests;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Input;
use Illuminate\Support\Facades\Validator;
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
    $employees = Employee::active()->get()->sortBy('name');

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

    if ($result) {
      return redirect()->back()->with('message', 'Success! You have stored a new employee.');
    } else {
      return redirect()->back()->with('alert', 'Sorry! Something went bad and we weren\'t able to add your employee.');
    }
  }


  public function handleAddNewEmployee(Request $request)
  {

    $rules = [
      'data.name' => 'required',
      'data.email' => 'required|email',
      'data.phone' => 'required|digits:10',
      'data.address' => 'required'
    ];
    $messages = [
      'data.name.required' => "The 'name' field is required.",
      'data.email.required' => "The 'email' field is required.",
      'data.email.email' => "The 'email' must be a valid email address.",
      'data.phone.required' => "The 'phone number' field is required.",
      'data.address.required' => "The 'address' field is required.",
      'data.phone.digits' => "The 'phone number' must be 10-digits."
    ];
    $validator = Validator::make($request->all(), $rules, $messages)->validate();

    $data = $request["data"];

    // check if an employee w/the same name already exists
    $existing = Employee::where('name', $data['name'])->get();
    if (count($existing) > 0) return false;

    $emp = new Employee();

    $isActive = ($data['isactive']) ? 1 : 0;
    $empResult = $emp->create([
      'name' => $data['name'],
      'email' => $data['email'],
      'phone_no' => $data['phone'],
      'address' => $data['address'],
      'is_active' => $isActive
    ]);
    $password = password_hash('Password1', PASSWORD_BCRYPT);

    if ($empResult->id > 0) {
      $user = new User();
      $userResult = $user->create([
        'id' => $empResult->id,
        'name' => $data['name'],
        'email' => $data['email'],
        'password' => $password
      ]);

      $result = ($empResult->id > 0 && $userResult->id > 0);
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

    foreach ($data as $key => $val) {
      if ($key != "tag" && $key != "token") {
        $emp[$key] = $val;
      }
    }


    try {
      DB::beginTransaction();
      DB::table('employees')
        ->where('id', $data['id'])
        ->update($emp->toArray());

      DB::commit();
    } catch (\mysqli_sql_exception $e) {
      DB::rollback();
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

    if ($isactive == 0) {
      $emps = Employee::all()->sortBy('name');
    } else {
      $emps = Employee::active()->orderByName()->get();
    }

    return view('emp_manager._emp', ['employees' => $emps]);
  }


  public function returnEmployeeRowData(Request $request)
  {
    $showall = $request['showall'];

    $showall = ($showall == 'true') ? 0 : 1;

    if ($showall == 0) {
      $emps = Employee::all()->sortBy('name');
    } else {
      $emps = Employee::active()->orderByName()->get();
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

  // Function for basic field validation (present and neither empty nor only white space
  function IsNullOrEmptyString($question)
  {
    return (!isset($question) || trim($question) === '');
  }
}
