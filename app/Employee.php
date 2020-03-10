<?php

namespace App;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Employee extends Model
{
    use SoftDeletes;

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
    
    public function toArray()
    {
        return [
            'name' => $this->name,
            'address' => $this->address,
            'phoneNo' => $this->phone_no,
            'email' => $this->email,
            'isActive' => $this->is_active,
            'isMgr' => $this->is_mgr,
            'salesId1' => $this->sales_id1,
            'salesId2' => $this->sales_id2,
            'salesId3' => $this->sales_id3
        ];
    }

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
		return $query->withTrashed()->where('is_active', 1);
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
		return $query->withTrashed();
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
