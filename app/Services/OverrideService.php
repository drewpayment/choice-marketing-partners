<?php
/**
 * Created by PhpStorm.
 * User: drewpayment
 * Date: 9/27/17
 * Time: 9:08 PM
 */

namespace App\Services;


use App\Employee;
use Illuminate\Support\Facades\DB;

class OverrideService {


	/**
	 * Returns array of subordinate employees by manager's id.
	 *
	 * @param $id
	 *
	 * @return array
	 */
	public function GetEmployeesByManagerId($id)
	{
    $employees = Employee::with('managedEmployees')->find($id)->managedEmployees;

    return $employees;
	}


	/**
	 * Adds employee to manager as override.
	 *
	 * @param $agentId
	 * @param $managerId
	 *
	 * @return bool
	 */
	public function AddEmployeeOverride($agentId, $managerId)
	{
		$manager = Employee::find($managerId);

		DB::beginTransaction();
		try {

      $manager->managedEmployees()->attach($agentId);

			DB::commit();
			$result = true;

		} catch(\mysqli_sql_exception $e) {

			DB::rollback();
			$result = false;

		}

		return $result;
	}


	/**
	 * Removes employee from manager as override.
	 *
	 * @param $agentId
	 * @param $managerId
	 *
	 * @return bool
	 */
	public function DeleteEmployeeOverride($agentId, $managerId)
	{
		$manager = Employee::with('managedEmployees')->find($managerId);

		DB::beginTransaction();
		try {
      $manager->managedEmployees()->detach($agentId);

			DB::commit();
			$result = true;
		} catch(\mysqli_sql_exception $e) {
			DB::rollback();
			$result = false;
		}

		return $result;
	}

}
