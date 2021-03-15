<?php

namespace App;

use App\EmployeePermission;
use DateTimeInterface;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Notifications\Notifiable;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, Notifiable, SoftDeletes;

    #region TABLE PROPERTIES

    /**
     * dates used by the model
     */
    protected $dates = ['created_at', 'updated_at', 'deleted_at'];

	/**
	 * table used by model
	 */
	protected $table = 'users';

	/**
	 * primary key used by model
	 */
	protected $primaryKey = 'id';

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        'id', 'name', 'email', 'password', 'isAdmin'
    ];

    /**
     * The attributes that should be hidden for arrays.
     *
     * @var array
     */
    protected $hidden = [
        'password', 'remember_token',
    ];

    #endregion

	#region Filters

	/**
	 * @param Builder $query
	 * @param $id int
	 *
	 * @return Builder
	 */
	public function scopeByUserId( Builder $query, int $id ): Builder
	{
		return $query->where('uid', $id);
	}

	/**
	 * @param Builder $query
	 * @param $id int
	 *
	 * @return Builder
	 */
	public function scopeByEmployeeId( Builder $query, int $id ): Builder
	{
		return $query->where('id', $id);
	}

	#endregion

	#region Relationships

	/**
	 * Get employee related to logged in user
	 *
	 * @return BelongsTo
	 */
	public function employee(): BelongsTo
	{
		return $this->belongsTo(Employee::class, 'id');
	}

	/**
	 * Has one UserFeature record.
	 *
	 * @return HasOne
	 */
	public function features(): HasOne
	{
		return $this->hasOne(UserFeature::class, 'user_id');
	}

	/**
	 * Returns active employee IDs this user has access to.
	 *
	 * @return HasMany
	 */
	public function employeePermissions(): HasMany
	{
		return $this->hasMany(EmployeePermission::class, 'employee_id', 'id');
	}

	/**
	 * User has many posts
	 *
	 * @return HasMany
	 */
	public function posts(): HasMany
	{
		return $this->hasMany(Post::class, 'author_id', 'id');
	}

	/**
	 * User has many comments
	 *
	 * @return HasMany
	 */
	public function comments(): HasMany
	{
		return $this->hasMany(Comment::class, 'from_user', 'id');
	}

	/**
	 * @return HasMany
	 */
	public function createdTasks(): HasMany
	{
		return $this->hasMany(Task::class, 'created_by_user_id', 'uid');
	}

	/**
	 * @return HasMany
	 */
	public function assignedTasks(): HasMany
	{
		return $this->hasMany(Task::class, 'assigned_to_user_id', 'uid');
	}

	#endregion

	#region Mutators

	/**
	 * User can post
	 *
	 * @return bool
	 */
	public function can_post(): bool
	{
		$role = $this->role;

		return ($role == 'author' || $role == 'admin');
	}

	/**
	 * User is admin
	 *
	 * @return bool
	 */
	public function is_admin(): bool
	{
		$role = $this->role;

		return ($role == 'admin');
    }
    
    public function getApiTokenAttribute()
    {
        return json_decode($this->attributes['api_token']);
    }

    public function setApiTokenAttribute($value)
    {
        $this->attributes['api_token'] = json_encode($value);
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

	#endregion
}
