<?php

namespace App\Http\Controllers\Api;

use App\Employee;
use App\Http\Controllers\Controller;
use App\Http\Results\OpResult;
use App\Services\OverrideService;
use Illuminate\Http\Request;

class OverridesController extends Controller
{

  protected OverrideService $service;

  public function __construct(OverrideService $service)
  {
    $this->service = $service;
  }

  public function getManagers(Request $request)
  {
    $result = new OpResult();

    $this->checkAdmin($request)->mergeInto($result);

    if ($result->hasError()) return $result->getResponse();

    $result->setData(Employee::with('managedEmployees')->managersOnly(true)->active()->get());

    return $result->getResponse();
  }

  public function getActiveEmployees(Request $request)
  {
    $result = new OpResult();

    $this->checkAdmin($request)->mergeInto($result);

    if ($result->hasError()) return $result->getResponse();

    $result->setData(Employee::active()->orderBy('name')->get());

    return $result->getResponse();
  }

  public function updateManagerEmployees(Request $request)
  {
    $result = new OpResult();

    $this->checkAdmin($request)->mergeInto($result);

    if ($result->hasError()) return $result->getResponse();

    $ids = array_map(fn ($value): int => $value['id'], $request->managedEmployees);

    $manager = Employee::with('managedEmployees')->find($request->id);

    $manager->managedEmployees()->sync($ids);

    $result->setData($manager->fresh(['managedEmployees']));

    return $result->getResponse();
  }

  /**
   * @return OpResult
   */
  private function checkAdmin(Request $request)
  {
    $result = new OpResult();

    $result->setStatus($request->session()->get('authenticatedUserIsAdmin'));

    if ($result->hasError())
      $result->setToFail('Must be an administrator to access this API.');

    return $result;
  }

}
