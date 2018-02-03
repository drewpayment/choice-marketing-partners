<?php

namespace App;

use Carbon\Carbon;
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
	 * You can use this to extend the normal collection to have custom functionality
	 *
	 * @param array $models
	 *
	 * @return CustomCollection
	 */
//	public function newCollection(array $models = [])
//	{
//		return new CustomCollection($models);
//	}


//	/**
//	 * @param $s
//	 *
//	 * @return bool|string
//	 */
//	function formatPhoneNumber($s) {
//		$rx = "/
//		    (1)?\D*     # optional country code
//		    (\d{3})?\D* # optional area code
//		    (\d{3})\D*  # first three
//		    (\d{4})     # last four
//		    (?:\D+|$)   # extension delimiter or EOL
//		    (\d*)       # optional extension
//		/x";
//		preg_match($rx, $s, $matches);
//		if(!isset($matches[0])) return false;
//
//		$country = $matches[1];
//		$area = $matches[2];
//		$three = $matches[3];
//		$four = $matches[4];
//		$ext = $matches[5];
//
//		$out = "$three-$four";
//		if(!empty($area)) $out = "$area-$out";
//		if(!empty($country)) $out = "+$country-$out";
//		if(!empty($ext)) $out .= "x$ext";
//
//		// check that no digits were truncated
//		// if (preg_replace('/\D/', '', $s) != preg_replace('/\D/', '', $out)) return false;
//		return $out;
//	}
//
//
//	/**
//	 * Phone number attribute getter, formats the integer into a phone number string
//	 *
//	 * @param $value
//	 *
//	 * @return string
//	 */
//	public function getPhoneNoAttribute($value)
//	{
//		$this->attributes['phone_no'] = $this->formatPhoneNumber($value);
//	}


	public function setPhoneNoAttribute($value)
	{
		$this->attributes['phone_no'] = preg_replace('/[^0-9]/s', '', $value);
	}


	/**
	 * Format date helper function.
	 * @param $date
	 * @param $format
	 *
	 * @return string
	 */
	function formatDate($date, $format)
	{
		$dt = Carbon::createFromFormat($format, $date);

		return $dt->format('m-d-Y');
	}


	/**
	 * Sets date on created at attribute.
	 * @param $value
	 *
	 * @return string
	 */
	public function getCreatedAtAttribute($value)
	{
		return $this->formatDate($value, 'Y-m-d H:i:s');
	}


	/**
	 * Sets date on updated at attribute.
	 * @param $value
	 *
	 * @return string
	 */
	public function getUpdatedAtAttribute($value)
	{
		return $this->formatDate($value, 'Y-m-d H:i:s');
	}


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
	 * Get overrides associated with the employee
	 *
	 * @return \Illuminate\Database\Eloquent\Relations\HasMany
	 */
	public function overrides()
	{
		return $this->hasMany(Override::class, 'agentid', 'id');
	}


	/**
	 * Get expenses associated with the employee
	 *
	 * @return \Illuminate\Database\Eloquent\Relations\HasMany
	 */
	public function expenses()
	{
		return $this->hasMany(Expense::class, 'agentid', 'id');
	}


	/**
	 * get user that this employee record owns
	 *
	 * @return \Illuminate\Database\Eloquent\Relations\HasOne
	 */
	public function user()
	{
		return $this->hasOne(User::class, 'id', 'id');
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
	 *
	 * @return \Illuminate\Database\Eloquent\Builder
	 */
	public function scopeActive($query)
	{
		return $query->where('is_active', 1);
	}


	/**
	 * Scope a query to show both active/inactive users.
	 *
	 * @param \Illuminate\Database\Eloquent\Builder $query
	 *
	 * @return \Illuminate\Database\Eloquent\Builder
	 */
	public function scopeShowAll($query)
	{
		return $query->whereIn('is_active', [0, 1]);
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
