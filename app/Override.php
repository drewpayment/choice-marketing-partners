<?php

namespace App;

use Illuminate\Database\Eloquent\Model;

class Override extends Model
{

	protected $fillable = [
		'vendor_id',
		'name',
		'sales',
		'commission',
		'total',
		'agentid',
		'issue_date',
		'wkending'
	];


	public function employee()
	{
		return $this->belongsToMany(Employee::class, 'employees');
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
			return $query->whereIn('agentid', $id);
		}

		return $query->where('agentid', $id);
	}


	/**
	 * @param \Illuminate\Database\Eloquent\Builder $query
	 * @param int
	 *
	 * @return \Illuminate\Database\Eloquent\Builder
	 */
	public function scopeVendorId($query, $id)
	{
		return $query->where('vendor_id', $id);
	}


	/**
	 * Scope query to filter by issue date
	 *
	 * @param \Illuminate\Database\Eloquent\Builder $query
	 * @param date
	 * @return \Illuminate\Database\Eloquent\Builder
	 */
	public function scopeIssueDate($query, $date)
	{
		return $query->where('issue_date', $date);
	}

}
