<?php

namespace App;

use Illuminate\Database\Eloquent\Model;
use Sofa\Eloquence\Eloquence;
use Sofa\Eloquence\Mappable;

class Employee extends Model
{

	use Eloquence, Mappable;

	protected $maps = [
		'phone' => 'phone_no'
	];


	/**
	 * table that model references
	 *
	 * @var string
	 */
	protected $table = 'employees';


	/**
	 * The attributes that are mass assignable.
	 *
	 * @var array
	 */
	protected $fillable = [
		'name', 'address', 'phone_no', 'email', 'is_active', 'sales_id1', 'sales_id2', 'sales_id3'
	];


	/**
	 * Get the permission associated with the employee
	 *
	 * @return \Illuminate\Database\Eloquent\Relations\BelongsToMany
	 */
	public function permissions()
	{
		return $this->belongsToMany(Permission::class, 'employee_permission', 'employee_id', 'permission_id');
	}

}
