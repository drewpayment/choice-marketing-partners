<?php

namespace App;

use Carbon\Carbon;
use DateTime;
use Illuminate\Database\Eloquent\Builder;
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
	 * @param Builder $query
	 * @param $id
	 *
	 * @return Builder
	 */
	public function scopeAgentId( Builder $query, $id ): Builder
	{
		if(!is_object($id) && $id == -1) {
			return $query;
		}
		else if (is_array($id))
		{
			return $this->scopeByAgentIds($query, $id);
		}

		return $query->where('agent_id', $id);
	}


	/**
	 * @param Builder $query
	 * @param $id
	 *
	 * @return Builder
	 */
	public function scopeVendorId( Builder $query, $id): Builder
	{
		if(!is_object($id) && $id == -1)
		{
			$vendors = Vendor::all();
			$ids = $vendors->pluck('id')->all();
			return $query->whereIn('vendor_id', $ids);
		}
		else if (is_array($id))
		{
			return $this->scopeByVendorIds($query, $id);
		}

		return $query->where('vendor_id', $id);
	}


	/**
	 * Scope query to the issue date passed.
	 *
	 * @param Builder $query
	 * @param $date
	 *
	 * @return Builder
	 */
	public function scopeIssueDate( Builder $query, $date ): Builder
	{
		return $query->where('issue_date', $date);
	}

	/**
	 * @param Builder $query
	 * @param $dates
	 *
	 * @return Builder
	 */
	public function scopeByIssueDates( Builder $query, $dates ): Builder
	{
		if (!is_array($dates))
		{
			if (!is_object($dates))
			{
				return $this->scopeIssueDate($query, $dates);
			}

			return $query;
		}

		return $query->whereIn('issue_date', $dates);
	}

	/**
	 * @param Builder $query
	 * @param Carbon $start_date
	 * @param Carbon $end_date
	 *
	 * @return Builder
	 */
	public function scopeBetweenDates( Builder $query, Carbon $start_date, Carbon $end_date ): Builder
	{
		if (!$start_date->isValid() || !$end_date->isValid())
		{
			return $query;
		}

		return $query->whereBetween('issue_date', [$start_date, $end_date]);
	}

	/**
	 * @param Builder $query
	 * @param $ids
	 *
	 * @return Builder
	 */
	public function scopeByAgentIds( Builder $query, $ids ): Builder
	{
		if (count($ids) == 1 && $ids[0] == -1)
		{
			return $query;
		}

		return $query->whereIn('agent_id', $ids);
	}

	/**
	 * @param Builder $query
	 * @param $ids
	 *
	 * @return Builder
	 */
	public function scopeByVendorIds( Builder $query, $ids ): Builder
	{
		if (count($ids) == 1 && $ids[0] == -1)
		{
			return $query;
		}

		return $query->whereIn('vendor_id', $ids);
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
