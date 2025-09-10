<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Http\Results\OpResult;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;

class HomeController extends Controller
{
    /**
     * Create a new controller instance.
     *
     * @return void
     */
    public function __construct()
    {
        $this->middleware('auth');
    }


    public function authenticated()
    {

    	return view('index');
    }


	/**
	 * Show the application dashboard.
	 *
	 * @return \Illuminate\Http\Response
	 */
    public function index()
    {
    	$admin = DB::table('employees')->where('is_admin', 1)->get();

    	return view('home', ['admin' => $admin, 'currentUser' => Auth::user()]);
    }

    public function getUserInfo(Request $request)
    {
        $result = new OpResult();

        return $result->trySetData(function() {
            return auth()->user();
        })->getResponse();
    }

}
