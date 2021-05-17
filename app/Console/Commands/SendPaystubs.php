<?php

namespace App\Console\Commands;

use App\Paystub;
use App\Services\PaystubService;
use Carbon\Carbon;
use Illuminate\Console\Command;

class SendPaystubs extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'send:paystubs';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Send paystubs for the specified issue date.';

    protected $paystubService;

	/**
	 * Create a new command instance.
	 *
	 * @param PaystubService $paystubService
	 */
    public function __construct(PaystubService $paystubService)
    {
    	$this->paystubService = $paystubService;

        parent::__construct();
    }

    /**
     * Execute the console command.
     *
     * @return void
     */
    public function handle()
    {
        $date = Carbon::today();

        if ($date->dayOfWeek == Carbon::TUESDAY)
        {
        	$date = $date->addDay();

	        $cDate = Carbon::createFromFormat('Y-m-d', $date);

	        $this->info('Starting to send paystubs.');

	        $paystubIds = Paystub::where('issue_date', $cDate)->get()->pluck('id');

	        $result = $this->paystubService->sendPaystubs($paystubIds);

	        if ($result->hasError())
	        {
		        $this->error($result->getData());
	        }
	        else
	        {
		        $this->info('Successfully finished sending paystubs.');
	        }
        }
    }
}
