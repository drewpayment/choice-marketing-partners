<?php


namespace App\Http\Middleware;


use App\User;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\URL;

class RedirectIfSpaAuthorized
{

	/**
	 * Handle an incoming request.
	 *
	 * @param Request $request
	 * @param Closure $next
	 * @param string|null $guard
	 *
	 * @return mixed
	 */
	public function handle(Request $request, Closure $next, $guard = null)
	{
		if (Auth::guard($guard)->check() && !str_contains(URL::current(), '/app'))
		{
			$u        = User::with( 'features' )->byEmployeeId( Auth::user()->id )->first();
			$hasNewUi = $u->features->has_new_ui;

			if ( $hasNewUi )
			{
				return redirect( '/app' );
			}
		}

		return $next($request);
	}
}