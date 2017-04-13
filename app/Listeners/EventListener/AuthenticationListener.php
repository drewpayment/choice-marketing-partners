<?php

namespace App\Listeners\EventListener;

use App\User;
use Illuminate\Auth\Events\Login;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Support\Facades\DB;

class AuthenticationListener
{
    /**
     * Create the event listener.
     *
     * @return void
     */
    public function __construct()
    {
        //
    }

    /**
     * Handle the event.
     *
     * @param  Login  $event
     * @return void
     */
    public function handle(Login $event)
    {
        $result = new User();
    	$user = $event->user;
        $id = $user->id;

        $result->name = $user->name;
        $result->email = $user->email;

        $emp = DB::table('employees')->where('id', '=', $id)->first();
        $result->isAdmin = ($emp->is_admin == 1) ? true : false;

        session(['authenticatedUserIsAdmin' => $result->isAdmin]);
    }
}
