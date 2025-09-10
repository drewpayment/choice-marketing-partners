<?php

namespace App\Plugins;

use Illuminate\Support\ServiceProvider as IlluminateServiceProvider;

class PdfServiceProvider extends IlluminateServiceProvider
{
    protected $defer = false;

    public function register()
    {
        $this->app->bind('mpdf', function() {
            return new PDF();
        });
    }

    public function provides()
    {
        return array('mpdf');
    }
}