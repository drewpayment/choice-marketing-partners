<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AuthorizationController extends Controller
{

  public function getAud(Request $request)
  {
    if (Auth::check())
    {
      $token = $request->session()->pull('aud');
      return response()->json(['aud' => $token]);
    }

    return response();
  }

}
