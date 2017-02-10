<?php

namespace App\Http\Controllers;

use App\Override;
use Illuminate\Http\Request;

use App\Http\Requests;

class OverrideController extends Controller
{
    //

	public function OverrideController(Request $request)
	{

		$override = new Override;

		return response()->json($request);

	}
}
