<?php

namespace App;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Paystub extends Model
{
    /**
     * Table to be used by the model.
     */
	protected $table = 'paystubs';

	/**
	 * Mass assignable fields on the model.
	 *
	 * @var array
	 */
	protected $fillable = ['id', 'agent_id', 'agent_name', 'vendor_id', 'vendor_name', 'amount', 'issue_date', 'weekend_date', 'modified_by', 'created_at', 'updated_at'];

	/**
	 * @return HasOne
	 */
	public function agent(): HasOne
	{
		return $this->hasOne(Employee::class, 'id', 'agent_id');
	}

	/**
	 * Scope query to the agent(s) id that is passed into the function.
	 *
	 * @param \Illuminate\Database\Eloquent\Builder $query
	 * @param $id
	 *
	 * @return \Illuminate\Database\Eloquent\Builder
	 */
	public function scopeAgentId($query, $id)
	{
		if(!is_object($id) && $id == -1) {
			return $query;
		}
		else if (is_array($id))
		{
			return $query->whereIn('agent_id', $id);
		}

		return $query->where('agent_id', $id);
	}


	public function scopeVendorId($query, $id)
	{
		if (is_array($id))
		{
			return $query->whereIn('vendor_id', $id);
		}

		if($id == -1)
		{
			$vendors = Vendor::all();
			$ids = $vendors->pluck('id')->all();
			return $query->whereIn('vendor_id', $ids);
		}

		return $query->where('vendor_id', $id);
	}


	/**
	 * Scope query to the issue date passed.
	 *
	 * @param \Illuminate\Database\Eloquent\Builder $query
	 * @param $date
	 *
	 * @return \Illuminate\Database\Eloquent\Builder
	 */
	public function scopeIssueDate($query, $date)
	{
		return $query->where('issue_date', $date);
	}


	/**
	 * Scope query to active
	 *
	 * @param $query
	 *
	 * @return mixed
	 */
	public function scopeActive($query)
	{
		return $query->where('active', 1);
	}
}
