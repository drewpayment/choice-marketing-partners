<?php
/**
 * Created by PhpStorm.
 * User: drewpayment
 * Date: 10/6/17
 * Time: 11:37 PM
 */

namespace App\Services;


use App\User;
use App\Paystub;
use App\Employee;
use App\Permission;
use App\EmployeePermission;
use Illuminate\Support\Facades\DB;

class EmployeeService {

	public function registerPermissionableUser($id)
	{
		$emp = Employee::find($id);
		$permission = new Permission;
		$permission->emp_id = $emp->id;
		$permission->is_active = $emp->is_active;

		DB::beginTransaction();
		try {
			$permission->save();
			DB::commit();

			$result = true;
		} catch (\mysqli_sql_exception $e) {
			DB::rollback();

			$result = false;
		}

		return $result;
    }

}