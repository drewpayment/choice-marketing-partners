<?php

namespace App;

use Illuminate\Database\Eloquent\Model;

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
}
