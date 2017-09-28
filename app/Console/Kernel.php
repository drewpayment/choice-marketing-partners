<?php

namespace App\Console;

use App\Helpers\Tasker;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Contracts\Events\Dispatcher;
use Illuminate\Contracts\Foundation\Application;
use Illuminate\Foundation\Console\Kernel as ConsoleKernel;

class Kernel extends ConsoleKernel
{
    /**
     * The Artisan commands provided by your application.
     *
     * @var array
     */
    protected $commands = [
        //
    ];

	/**
     * Define the application's command schedule.
     *
     * @param  \Illuminate\Console\Scheduling\Schedule  $schedule
     * @return void
     */
    protected function schedule(Schedule $schedule)
    {
//		/**
//		 * Runs task to populate invoices that aren't indexed yet.
//		 *
//		 * Access cron jobs with cli: crontab -e
//		 */
//    	$schedule->call(function(){
//			Tasker::processInvoiceData();
//		})->weekdays()
//			->everyMinute()
//			->unlessBetween('22:00', '06:00')
//			->withoutOverlapping();
//
//    	/**
//    	 * Task to index tables in mysql.
//    	 */
//    	$schedule->call(function(){
//    		// need to run task to index database tables
//	    })->sundays()
//		    ->daily()
//		    ->withoutOverlapping();
    }

    /**
     * Register the Closure based commands for the application.
     *
     * @return void
     */
    protected function commands()
    {
        require base_path('routes/console.php');
    }
}
