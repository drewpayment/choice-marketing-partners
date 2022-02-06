<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Support\Facades\DB;

class SetDbSession
{
  public function handle($request, Closure $next)
  {
    DB::statement("SET SESSION sql_require_primary_key = 0;");

    return $next($request);
  }
}
