<?php

namespace App;

use Carbon\Carbon;
use DateTimeInterface;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Employee extends Model
{
    use SoftDeletes;

    #region TABLE PROPERTIES

    protected $primaryKey = 'id';

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
        'name', 'address', 'phone_no', 'email', 'is_active', 'is_mgr', 'sales_id1', 'sales_id2', 'sales_id3',
        'created_at', 'updated_at', 'hidden_payroll', 'deleted_at'
    ];

	#endregion


	#region ACCESS MODIFIERS

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
    
    public function getIsActiveAttribute()
    {
        return $this->attributes['is_active'] == 1;
    }

    public function setIsActiveAttribute($value)
    {
        $this->attributes['is_active'] = $value == 'true' || $value == 1 ? 1 : 0;
    }

    public function getIsMgrAttribute()
    {
        return $this->attributes['is_mgr'] == 1;
    }

    public function setIsMgrAttribute($value)
    {
        $this->attributes['is_mgr'] = $value == 'true' || $value == 1 ? 1 : 0;
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

	#endregion


	#region RELATIONSHIPS

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
        return $this->hasMany(Invoice::class, 'agentid');
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

	#endregion


	#region FILTERS

	/**
	 * @param Builder $query
	 * @param $id
	 *
	 * @return Builder
	 */
	public function scopeByEmployeeId(Builder $query, int $id): Builder
	{
		return $query->where('id', $id);
	}

	/**
	 * scope query to filter managers
	 *
	 * @param Builder $query
	 * @param bool
	 *
	 * @return Builder
	 */
	public function scopeManagersOnly(Builder $query, bool $mgrsOnly): Builder
	{
		$managersOnly = ($mgrsOnly) ? 1 : 0;
		return $query->where('is_mgr', $managersOnly);
	}


	/**
	 * Scope a query to only include active users.
	 *
	 * @param Builder $query
	 *
	 * @return Builder
	 */
	public function scopeActive(Builder $query): Builder
	{
		return $query->where('is_active', 1);
	}


	/**
	 * Scope a query to show both active/inactive users.
	 *
	 * @param Builder $query
	 *
	 * @return Builder
	 */
	public function scopeShowAll( Builder $query ): Builder
	{
		return $query->withTrashed();
	}


	/**
	 * Score a query to order by employee's name.
	 *
	 * @param Builder $query
	 *
	 * @return Builder
	 */
	public function scopeOrderByName( Builder $query ): Builder
	{
		return $query->orderBy('name', 'asc');
	}


	/**
	 * Scope query to filter hidden from payroll employees.
	 *
	 * @param Builder $query
	 *
	 * @return Builder
	 */
	public function scopeHideFromPayroll( Builder $query ): Builder
	{
		return $query->where('hidden_payroll', 0);
	}


	/**
	 * scope query to filter by agent id
	 *
	 * @param Builder $query
	 * @param int
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
			return $query->whereIn('id', $id);
		}

		return $query->where('id', $id);
	}


	/**
	 * scope list of agents
	 *
	 * @param Builder $query
	 * @param array
	 *
	 * @return Builder
	 */
	public function scopeListOfAgents( Builder $query, $arr ): Builder
	{
		return $query->whereIn('id', $arr);
	}

	#endregion

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
