<?php

namespace App;

use Illuminate\Database\Eloquent\Model;

class Invoice extends Model
{

	/**
	 * Primary key used by the model
	 */
	protected $primaryKey = 'invoice_id';

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
		return $this->belongsToMany(Employee::class, 'employee_invoice', 'invoice_id', 'employee_id');
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
			return $query->whereIn('agentid', $id);
		}

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
		if(!is_object($date) && $date == -1) return $query;

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
		if($id == -1)
		{
			$vendors = Vendor::all();
			$ids = $vendors->pluck('id')->all();
			return $query->whereIn('vendor', $ids);
		}

		return $query->where('vendor', $id);
	}


	/**
	 * scope query to active only
	 *
	 * @param \Illuminate\Database\Eloquent\Builder $query
	 * @return \Illuminate\Database\Eloquent\Builder
	 */
	public function scopeWithActiveAgent($query)
	{
		return $query->with(['agent' => function($query){
			$query->where('is_active', 1);
		}]);
	}

}
