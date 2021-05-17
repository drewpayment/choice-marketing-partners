<?php

namespace App\Providers;

use Barryvdh\LaravelIdeHelper\IdeHelperServiceProvider;
use Carbon\Carbon;
use Illuminate\Support\Facades\Blade;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Bootstrap any application services.
     *
     * @return void
     */
    public function boot()
    {
        Blade::directive('datetime', function($expression){
        	try
	        {
		        $dt = Carbon::createFromFormat('Y-m-d', $expression)
		                    ->format('m-d-Y');
	        }
	        catch (\Exception $ex)
	        {
	        	$dt = $expression;
	        }
	        return "<?php echo $dt; ?>";
        });
        
        Blade::if('authurl', function() {
            return Auth::check() || strpos(URL::current(), 'login') !== false;
        });
        
        Blade::if('guesturl', function() {
            return !Auth::check() && strpos(URL::current(), 'login') === false;
        });

        Blade::directive('currency', function ($money) {
        	return "<?php echo number_format($money, 2); ?>";
        });
    }

    /**
     * Register any application services.
     *
     * @return void
     */
    public function register()
    {
        if($this->app->environment() !== 'production')
        {
	        $this->app->register( IdeHelperServiceProvider::class );
        }
    }
}
