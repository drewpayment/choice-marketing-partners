<?php

namespace App;

use Illuminate\Database\Eloquent\Model;

class Comment extends Model
{
	/**
	 * Columns to restrict modifications on table.
	 *
	 */
    protected $guarded = [];

    /**
     * Table used by the model.
     *
     */
    protected $table = 'comments';

	/**
	 * User who has commented
	 *
	 * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
	 */
	public function author()
    {
    	return $this->belongsTo(Employee::class, 'from_user');
    }

	/**
	 * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
	 */
	public function post()
    {
    	return $this->belongsTo(Post::class, 'on_post');
	}
	
	/**
	 * @return \Illuminate\Database\Eloquent\Builder
	 */
	public function scopeActive($query)
	{
		return $query->where('active', 1);
	}
}
