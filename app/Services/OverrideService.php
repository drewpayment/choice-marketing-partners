<?php
/**
 * Created by PhpStorm.
 * User: drewpayment
 * Date: 9/27/17
 * Time: 9:08 PM
 */

namespace App\Services;


use App\Employee;
use App\Permission;
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
		$employees = Employee::all();
		$permissions = Employee::find($id)->permissions;
		$array = [];

		foreach($permissions as $p)
		{
			$array[] = $employees->first(function($val, $key) use ($p) {
				return $val->id == $p->emp_id && $p->is_active == 1;
			});
		}

		foreach($array as $key => $a)
		{
			if($a == null)
				unset($array[$key]);
		}

		return $array;
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
		$permission = Permission::where('emp_id', $agentId)->first();
		$manager = Employee::find($managerId);

		DB::beginTransaction();
		try {

			$manager->permissions()->attach($permission);
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
		$permission = Permission::where('emp_id', $agentId)->first();
		$manager = Employee::find($managerId);

		DB::beginTransaction();
		try {
			$manager->permissions()->detach($permission);
			DB::commit();
			$result = true;
		} catch(\mysqli_sql_exception $e) {
			DB::rollback();
			$result = false;
		}

		return $result;
	}

}