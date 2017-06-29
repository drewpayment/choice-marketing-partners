<?php

namespace App;

use Illuminate\Database\Eloquent\Model;

class Employee extends Model
{


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
		'name', 'address', 'phone_no', 'email', 'is_active', 'is_mgr', 'sales_id1', 'sales_id2', 'sales_id3'
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


	/**
	 * Get invoices associated with the employee
	 *
	 * @return \Illuminate\Database\Eloquent\Relations\BelongsToMany
	 */
	public function invoices()
	{
		return $this->belongsToMany(Invoice::class, 'employee_invoice', 'employee_id');
	}


	/**
	 * scope query to filter managers
	 *
	 * @param \Illuminate\Database\Eloquent\Builder $query
	 * @param bool
	 * @return \Illuminate\Database\Eloquent\Builder
	 */
	public function scopeManagersOnly($query, $mgrsOnly)
	{
		$managersOnly = ($mgrsOnly) ? 1 : 0;
		return $query->where('is_mgr', $managersOnly);
	}


	/**
	 * Scope a query to only include active users.
	 *
	 * @param \Illuminate\Database\Eloquent\Builder $query
	 * @return \Illuminate\Database\Eloquent\Builder
	 */
	public function scopeActive($query)
	{
		return $query->where('is_active', 1);
	}


	/**
	 * Score a query to order by employee's name.
	 *
	 * @param \Illuminate\Database\Eloquent\Builder $query
	 * @return \Illuminate\Database\Eloquent\Builder
	 */
	public function scopeOrderByName($query)
	{
		return $query->orderBy('name', 'asc');
	}


	/**
	 * Scope query to filter hidden from payroll employees.
	 *
	 * @param \Illuminate\Database\Eloquent\Builder $query
	 * @return \Illuminate\Database\Eloquent\Builder
	 */
	public function scopeHideFromPayroll($query)
	{
		return $query->where('hidden_payroll', 0);
	}


	/**
	 * scope query to filter by agent id
	 *
	 * @param \Illuminate\Database\Eloquent\Builder $query
	 * @param int
	 * @return \Illuminate\Database\Eloquent\Builder
	 */
	public function scopeAgentId($query, $id)
	{
		if(!is_object($id) && $id == -1) {
			return $query;
		}
		else if (is_array($id))
		{
			return $query->whereIn('id', $id);
		}

		return $query->where('id', $id);
	}


	/**
	 * scope list of agents
	 *
	 * @param \Illuminate\Database\Eloquent\Builder $query
	 * @param array
	 * @return \Illuminate\Database\Eloquent\Builder
	 */
	public function scopeListOfAgents($query, $arr)
	{
		return $query->whereIn('id', $arr);
	}


}
