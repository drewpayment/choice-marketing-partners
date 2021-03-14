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
		$url = URL::current();
		$isLogoutRequest = str_ends_with($url, '/logout');
		$isAppRequest = str_contains($url, '/app');
		$isSanctum = str_contains($url, '/sanctum');
		$isApi = str_contains($url, '/api');

		if ($isApi) return $next($request);
		if ($isLogoutRequest && !$isAppRequest) return $next($request);
		if ($isSanctum) return $next($request);

		if (Auth::guard($guard)->check() && !str_contains(URL::current(), '/app'))
		{
			$u        = User::with( 'features' )->byEmployeeId( Auth::user()->id )->first();
			$hasNewUi = $u->features->has_new_ui;

			if ( $hasNewUi )
			{
				return redirect( '/app?u='.$u->id );
			}
		}

		return $next($request);
	}
}