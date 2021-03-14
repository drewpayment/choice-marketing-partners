<?php

namespace App;

use DateTimeInterface;
use Illuminate\Database\Eloquent\Model;

class Payroll extends Model
{

	/**
	 * table used by the model
	 */
	protected $table = 'payroll';

	/**
	 * mass assignable fields on the model
	 */
	protected $fillable = ['agent_id', 'agent_name', 'amount', 'is_paid', 'vendor_id', 'pay_date'];

	/**
	 * scope query to order by name
	 *
	 * @param \Illuminate\Database\Eloquent\Builder $query
	 * @return \Illuminate\Database\Eloquent\Builder
	 */
	public function scopeOrderByName($query)
	{
		return $query->orderBy('agent_name', 'asc');
	}

	/**
	 * @param \Illuminate\Database\Eloquent\Builder $query
	 * @return \Illuminate\Database\Eloquent\Builder
	 */
	public function scopeOrderByDate($query)
	{
		return $query->orderBy('pay_date', 'desc');
	}

	/**
	 * scope query to filter by pay date
	 *
	 * @param \Illuminate\Database\Eloquent\Builder $query
	 * @param string
	 * @return \Illuminate\Database\Eloquent\Builder
	 */
	public function scopePayDate($query, $date)
	{
		return $query->where('pay_date', $date);
	}

	/**
	 * @param \Illuminate\Database\Eloquent\Builder $query
	 * @param string
	 * @return \Illuminate\Database\Eloquent\Builder
	 */
	public function scopeVendor($query, $vendor)
	{
		if($vendor == -1) {
			return $query;
		}
		else
		{
			return $query->where('vendor_id', $vendor);
		}
	}

	/**
	 * scope query to filter by payroll id
	 *
	 * @param \Illuminate\Database\Eloquent\Builder $query
	 * @param int
	 * @return \Illuminate\Database\Eloquent\Builder
	 */
	public function scopePayrollId($query, $id)
	{
		return $query->where('id', $id);
	}

	/**
	 * scope query to order by paid first
	 *
	 * @param \Illuminate\Database\Eloquent\Builder $query
	 * @return \Illuminate\Database\Eloquent\Builder
	 */
	public function scopePaidFirst($query)
	{
		return $query->orderBy('is_paid', 'desc');
	}

	/**
	 * Scope query to filter by agent id
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
			return $query->whereIn('agent_id', $id);
		}

		return $query->where('agent_id', $id);
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
		if(!is_object($date) && $date == -1) return $query;

		return $query->where('pay_date', $date);
	}


	/**
	 * scope query filter by vendor id
	 *
	 * @param \Illuminate\Database\Eloquent\Builder $query
	 * @param int
	 * @return \Illuminate\Database\Eloquent\Builder
	 */
	public function scopeVendorId($query, $id)
	{
		if($id == -1)
		{
			$vendors = Vendor::all();
			$ids = $vendors->pluck('id')->all();
			return $query->whereIn('vendor_id', $ids);
		}

		return $query->where('vendor_id', $id);
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
