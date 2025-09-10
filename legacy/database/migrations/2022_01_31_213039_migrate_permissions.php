<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class MigratePermissions extends Migration
{
  /**
   * Run the migrations.
   *
   * @return void
   */
  public function up()
  {
    DB::statement('
      insert into manager_employees (manager_id, employee_id, created_at, updated_at)
      select e.id, e2.id, now(), now()
      from employees e
      join employee_permission ep on ep.employee_id = e.id
      join permissions p on ep.permission_id = p.id
      join employees e2 on e2.id = p.emp_id
      where e.is_mgr = 1
    ');
  }

  /**
   * Reverse the migrations.
   *
   * @return void
   */
  public function down()
  {
    //
  }
}
