<?php

namespace App\Http\View\Composers;

use Closure;
use Illuminate\Support\Facades\View;
use Illuminate\Support\ServiceProvider;

class ViewServiceProvider extends ServiceProvider
{
    public function boot()
    {
        View::composer(
            'layouts.app', AngularComposer::class
        );
    }

    public function register()
    {
        // 
    }
}
