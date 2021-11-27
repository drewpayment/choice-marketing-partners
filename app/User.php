<?php

namespace App;

use App\EmployeePermission;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Notifications\Notifiable;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class User extends Authenticatable
{
	use Notifiable, SoftDeletes;

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
	protected $primaryKey = 'uid';

	/**
	 * The attributes that are mass assignable.
	 *
	 * @var array
	 */
	protected $fillable = [
		'id', 'name', 'email', 'password', 'created_at', 'updated_at', 'role'
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
	 * Returns active employee IDs this user has access to.
	 *
	 * @return HasMany
	 */
	public function employeePermissions(): HasMany
	{
		return $this->hasMany(EmployeePermission::class, 'employee_id', 'id');
	}

	/**
	 * @param Builder $query
	 * @param $id int
	 *
	 * @return Builder
	 */
	public function scopeByUserId(Builder $query, int $id): Builder
	{
		return $query->where('uid', $id);
	}

	/**
	 * @param Builder $query
	 * @param $id int
	 *
	 * @return Builder
	 */
	public function scopeByEmployeeId(Builder $query, int $id): Builder
	{
		return $query->where('id', $id);
	}

	/**
	 * @param Builder $query
	 * @param string $email
	 *
	 * @return Builder
	 */
	public function scopeByEmail(Builder $query, string $email): Builder
	{
		return $query->where('email', $email);
	}

	/**
	 * User has many posts
	 *
	 * @return HasMany
	 */
	public function posts()
	{
		return $this->hasMany(Post::class, 'author_id', 'id');
	}

	/**
	 * User has many comments
	 *
	 * @return HasMany
	 */
	public function comments()
	{
		return $this->hasMany(Comment::class, 'from_user', 'id');
	}

	/**
	 * Get user's notification settings.
	 *
	 * @return HasOne
	 */
	public function notifications(): HasOne
	{
		return $this->hasOne(UserNotification::class, 'user_id', 'uid');
	}

	/**
	 * User can post
	 *
	 * @return bool
	 */
	public function can_post()
	{
		$role = $this->role;

		return ($role == 'author' || $role == 'admin');
	}

	/**
	 * User is admin
	 *
	 * @return bool
	 */
	public function is_admin()
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
	
	public function getCreatedAtAttribute($value)
	{
		$dt = Carbon::parse($value);
		return $dt->format('Y-m-d');
	}
	
	public function getUpdatedAtAttribute($value)
	{
		$dt = Carbon::parse($value);
		return $dt->format('Y-m-d');
	}
	
}
