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

    $has_requests = true;
    foreach ($employees as $ee) {
      if (!$has_requests) continue;
      
      $this->info('Employee: ' . $ee->name);

      if (strlen($ee->address) > 10 && $ee->city == null) {
        $addr_parts = explode(' ', $ee->address);

        $maybe_zip = $addr_parts[count($addr_parts) - 1];

        if (is_numeric($maybe_zip) && strlen($maybe_zip) > 4) {
          $this->info($maybe_zip);

          $resp = $this->getZipStatus($maybe_zip);

          if ($resp == null) {
            $this->error('Failed to get API status.');
            return;
          }

          $ee->has_been_fixed = true;

          $has_requests = $resp['remaining_requests'] > 0;

          if (!$has_requests) {
            $this->error('Out of API requests!');
            $ee->save();
            return;
          };

          $resp = $this->search($maybe_zip);

          if ($resp == null) {
            $this->error('Failed to find addresses for ' . $maybe_zip . ' from API.');
            $ee->save();
            continue;
          };

          $results = $resp['results'];

          if ($results == null) {
            $this->error('Failed to find results object ' . $maybe_zip . ' in the API response.');
            $ee->save();
            continue;
          };

          $result = $results[$maybe_zip];

          if ($result == null) {
            $this->error('Failed to find a match for ' . $maybe_zip . ' in the API response.');
            $ee->save();
            continue;
          };

          $result = $result[0];

          $ee->city = $result['city'];
          $ee->state = $result['state'];
          $ee->country = $result['country_code'];
          $ee->postal_code = $result['postal_code'];

          $ee->save();
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

  private function getZipStatus($zipcode)
  {
    $url = env('ZIPCODE_URL', 'https://app.zipcodebase.com/api/v1') . '/status';
    $api_key = env('ZIPCODE_KEY', 'dbd21640-36c1-11ec-8553-2d4d26a369c6');

    $request = Http::withHeaders(['apikey' => $api_key]);

    $response = $request->get($url);

    if ($response->ok()) {
      return $response->json();
    }

    return null;
  }

  private function search($zipcode)
  {
    $url = env('ZIPCODE_URL', 'https://app.zipcodebase.com/api/v1') . '/search';
    $api_key = env('ZIPCODE_KEY', 'dbd21640-36c1-11ec-8553-2d4d26a369c6');

    $request = Http::withHeaders(['apikey' => $api_key]);

    $response = $request->get($url, [
      'codes' => $zipcode,
      'country' => 'US'
    ]);

    if ($response->ok()) {
      return $response->json();
    }

    return null;
  }
}
