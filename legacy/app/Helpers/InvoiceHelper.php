<?php


namespace App\Helpers;

use App\User;
use App\Vendor;
use App\Expense;
use App\Invoice;
use App\Paystub;
use App\Payroll;
use App\Employee;
use App\Http\Results\OpResult;
use App\Override;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;



class InvoiceHelper
{

  public function searchPaystubData($params)
  {
    $params = is_null($params) ? (object)['vendor' => -1, 'agent' => -1, 'date' => -1] : (object)$params;
    $thisUser = Auth::user()->with('managedEmployees')->employee;
    $isAdmin = ($thisUser->is_admin == 1);
    $isManager = ($thisUser->is_mgr == 1);
    $date = ($params->date != -1) ? new Carbon($params->date) : $params->date;
    $vendor = $params->vendor;

    if ($params->agent == -1) {
      if ($isAdmin) {
        $agents = Employee::active()->hideFromPayroll()->orderByName()->get();
        $rows = Paystub::vendorId($vendor)
          ->issueDate($date)
          ->agentId($agents->pluck('id')->toArray())
          ->orderBy('agent_name')
          ->get();
      } else {
        $ids = [$thisUser];
        $ids = array_merge($ids, $thisUser->managedEmployees);
        dd($ids);

        $rows = Paystub::vendorId($params->vendor)
            ->issueDate($date)
            ->agentId($ids)
            ->orderBy('agent_name')
            ->get();
      }
    } else {
      $agents = Employee::active()->hideFromPayroll()->orderByName()->get();
      $rows = Paystub::vendorId($params->vendor)
        ->issueDate($date)
        ->agentId($params->agent)
        ->orderBy('agent_name')
        ->get();
    }

    $paystubs = collect($rows);
    $agents = collect($agents);
    $vendors = Vendor::all();

    return (object)[
      'rows' => $rows,
    ];
  }

  /**
   * Undocumented function
   *
   * @param Employee $user
   * @param integer $employeeId
   * @return OpResult
   */
  public function hasAccessToEmployee(Employee $user, $employeeId)
  {
    $result = new OpResult();

    if ($user->id == $employeeId) return $result->setToSuccess();

    $childUsers = $user->managedEmployees->pluck('id');
    $isManager = $user->is_mgr == 1;
    $isAdmin = $user->is_admin == 1;

    return $employeeId == -1 && ($isAdmin || $isManager) || $isAdmin || ($childUsers->contains($employeeId) && $isManager)
      ? $result->setToSuccess()
      : $result->setToFail('User does not have permission to access employee');
  }


  /*
	 * Check for existing invoices, return bool
	 *
	 */
  /**
   * @param $agentId
   * @param $vendor
   * @param $date
   *
   * @return bool
   */
  public function checkForExistingInvoice($agentId, $vendor, $date)
  {
    $dt = Carbon::parse($date)->format('Y-m-d');
    $invoices = Invoice::agentId($agentId)->vendorId($vendor)->issueDate($dt)->get();
    $overrides = Override::agentId($agentId)->vendorId($vendor)->issueDate($dt)->get();
    $expenses = Expense::agentId($agentId)->vendorId($vendor)->issueDate($dt)->get();

    if ($invoices->count() > 0 || $overrides->count() > 0 || $expenses->count() > 0) {
      return true;
    } else {
      return false;
    }
  }
}
