<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Employee;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;

class FixEmployeeAddresses extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'emps:addrfix';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Breaks out and fixes any addresses that do not conform to multi-field addresses.';

    /**
     * Create a new command instance.
     *
     * @return void
     */
    public function __construct()
    {
        parent::__construct();
    }

    /**
     * Execute the console command.
     *
     * @return mixed
     */
    public function handle()
    {
        $this->info('Checking for malformed addresses in Employees tables...');
        
        $employees = Employee::withTrashed()->where('has_been_fixed', '=', false)
            ->where(function ($query) {
                $query->where('city', null)
                    ->orWhere('state', null)
                    ->orWhere('country', null);
            })
            ->get();
        
        foreach ($employees as $ee) 
        {
            if (strlen($ee->address) > 10 && $ee->city == null) {
                $addr_parts = explode(' ', $ee->address);
                
                $maybe_zip = $addr_parts[count($addr_parts) - 1];
                
                if (is_numeric($maybe_zip) && strlen($maybe_zip) > 4) 
                {
                    $this->info($maybe_zip);
                }
            }    
        }
        
        // Set them to fixed!
        // if ($employees->count() > 0)
        // {
        //     DB::table('employees')->where('has_been_fixed', '=', false)
        //         ->where(function ($query) {
        //             $query->where('city', null)
        //                 ->orWhere('state', null)
        //                 ->orWhere('country', null);
        //         })
        //         ->update(['has_been_fixed' => true]);
        // }
    }
    
    private function getZipStatus(int $zipcode)
    {
        $url = env('ZIPCODE_URL') . '/status';
        $api_key = env('ZIPCODE_KEY');
        
        // $response = Http::get($url);
    }
}
