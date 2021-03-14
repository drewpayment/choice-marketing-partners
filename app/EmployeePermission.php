<?php

namespace App;

use DateTimeInterface;
use Illuminate\Database\Eloquent\Model;

class EmployeePermission extends Model
{

	/**
	 * table the model references
	 *
	 * @var string
	 */
    protected $table = 'employee_permission';

    public $incrementing = false;
    
    protected $primaryKey = 'employee_id';


	/**
	 * mass assignable fields
	 *
	 * @var array
	 */
	protected $fillable = [
		'employee_id', 'permission_id'
    ];

    public function permissions()
    {
        return $this->hasOne(Permission::class, 'id', 'permission_id');
    }


	/**
	 * scope query to filter by employee id
	 *
	 * @param \Illuminate\Database\Eloquent\Builder $query
	 * @param int
	 * @return \Illuminate\Database\Eloquent\Builder
	 */
	public function scopeByEmployeeId($query, $id)
	{
		return $query->where('employee_id', $id);
	}


	/**
	 * scope query to filter active only
	 *
	 * @param \Illuminate\Database\Eloquent\Builder $query
	 * @return \Illuminate\Database\Eloquent\Builder
	 */
	public function scopeActive($query)
	{
        return $query->where('is_active', 1)
            ->orWhere('is_active', true);
	}

	/**
	 * Prepare a date for array / JSON serialization.
	 *
	 * @param  DateTimeInterface  $date
	 * @return string
	 */
	protected function serializeDate(DateTimeInterface $date): string
	{
		return $date->format('Y-m-d H:i:s');
	}

}
