<?php

namespace App;

use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Notifications\Notifiable;
use Illuminate\Foundation\Auth\User as Authenticatable;

class User extends Authenticatable
{
    use Notifiable, SoftDeletes;

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

    /**
     * Get employee related to logged in user
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function employee()
    {
    	return $this->belongsTo(Employee::class, 'id');
    }

	/**
	 * @param \Illuminate\Database\Eloquent\Builder $query
	 * @param $id int
	 *
	 * @return \Illuminate\Database\Eloquent\Builder
	 */
	public function scopeUserId($query, $id)
	{
		return $query->where('id', $id);
	}

	/**
	 * User has many posts
	 *
	 * @return \Illuminate\Database\Eloquent\Relations\HasMany
	 */
	public function posts()
	{
		return $this->hasMany(Post::class, 'author_id', 'id');
	}

	/**
	 * User has many comments
	 *
	 * @return \Illuminate\Database\Eloquent\Relations\HasMany
	 */
	public function comments()
	{
		return $this->hasMany(Comment::class, 'from_user', 'id');
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
}
