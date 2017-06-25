<?php

namespace App;

use Illuminate\Database\Eloquent\Model;

class Invoice extends Model
{
    /**
	 * The attributes that are mass assignable.
	 *
	 * @var array
	 */
	protected $fillable = [
		'id', 'sale_date', 'first_name', 'last_name', 'address', 'city', 'status', 'amount', 'agentid', 'issue_date', 'created_at', 'updated_at'
	];


	/**
	 * access agent info from invoice
	 *
	 * @return \Illuminate\Database\Eloquent\Relations\BelongsToMany
	 */
	public function agent()
	{
		return $this->belongsToMany(Employee::class, 'employee_invoice', 'employee_id', 'invoice_id');
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
		return $query->where('agentid', $id);
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


	/**
	 * scope query filter by vendor id
	 *
	 * @param \Illuminate\Database\Eloquent\Builder $query
	 * @param int
	 * @return \Illuminate\Database\Eloquent\Builder
	 */
	public function scopeVendorId($query, $id)
	{
		return $query->where('vendor', $id);
	}

}
