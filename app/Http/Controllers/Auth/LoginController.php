<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\User;
use Illuminate\Foundation\Auth\AuthenticatesUsers;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class LoginController extends Controller
{
    /*
    |--------------------------------------------------------------------------
    | Login Controller
    |--------------------------------------------------------------------------
    |
    | This controller handles authenticating users for the application and
    | redirecting them to your home screen. The controller uses a trait
    | to conveniently provide its functionality to your applications.
    |
    */

    use AuthenticatesUsers;

    /**
     * Where to redirect users after login.
     *
     * @var string
     */
    protected $redirectTo = '/';


    /**
     * Create a new controller instance.
     *
     * @return void
     */
    public function __construct()
    {
        $this->middleware('guest', ['except' => 'logout']);
    }

    public function showLoginForm()
    {
        $users = User::with('employee')
            ->has('employee')
            ->orderBy('name', 'asc')
            ->get();

        return view('auth.login', [
            'users' => $users,
        ]);
    }

    public function login(Request $request)
    {
        $email = $request->input('email');

        $user = User::byEmail($email)->first();

        if ($user)
        {
          $passwords_match = Hash::check($request->password, $user->password);

          if ($passwords_match)
          {
            Auth::login($user);

            // add access/refresh tokens to DB so .NET microservice can read them from the database
          }
        }
        else
        {
          return response(['Invalid credentials. Please try again.', 401]);
        }

        return $this->sendLoginResponse($request);
    }
}
