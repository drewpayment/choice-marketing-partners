<?php

namespace App\Providers;

use App\Plugins\JsonResponseFactory;
use Illuminate\Support\ServiceProvider;
use Illuminate\Contracts\Routing\ResponseFactory;

class JsonResponseServiceProvider extends ServiceProvider
{
    public function register() 
    {
        $view = $this->app->make('view');
        $redirect = $this->app->make('redirect');
        $this->app->singleton(ResponseFactory::class, function() use ($view, $redirect) {
            return new JsonResponseFactory($view, $redirect);
        });
    }
}