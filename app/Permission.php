<?php

namespace App;

use Illuminate\Database\Eloquent\Model;
use Sofa\Eloquence\Eloquence;
use Sofa\Eloquence\Mappable;

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

}
