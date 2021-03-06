<?php

namespace App;

use App\Employee;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Builder;

class Permission extends Model
{

	/**
	 * table the model references
	 *
	 * @var string
	 */
	protected $table = 'permissions';


	/**
	 * mass assignable fields
	 *
	 * @var array
	 */
	protected $fillable = [
		'id', 'emp_id', 'roll_up', 'is_active'
	];


	/**
	 * access manager info from permission
	 *
	 * @return \Illuminate\Database\Eloquent\Relations\BelongsToMany
	 */
	public function manager()
	{
		return $this->belongsToMany(Employee::class, 'employee_permission', 'employee_id', 'permission_id');
	}


	/**
	 * scope query to filter by employee id
	 *
	 * @param \Illuminate\Database\Eloquent\Builder $query
	 * @param int
	 * @return \Illuminate\Database\Eloquent\Builder
	 */
	public function scopeEmpId($query, $id)
	{
		return $query->where('emp_id', $id);
	}


	/**
	 * scope query to filter active only
	 *
	 * @param \Illuminate\Database\Eloquent\Builder $query
	 * @return \Illuminate\Database\Eloquent\Builder
	 */
	public function scopeActive($query)
	{
		return $query->where('is_active', 1);
	}

}
