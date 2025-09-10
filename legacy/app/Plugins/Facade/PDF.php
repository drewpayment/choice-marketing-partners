<?php

namespace App\Plugins\Facade;

use Illuminate\Support\Facades\Facade as IlluminateFacade;

class PDF extends IlluminateFacade
{
    protected static function getFacadeAccessor()
    {
        return 'mpdf';
    }
}