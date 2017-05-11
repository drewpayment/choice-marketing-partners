<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

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

}
