<?php

namespace App;

use Illuminate\Database\Eloquent\Model;

class Post extends Model
{
	/**
	 * guarded columns from modifications
	 */
	protected $guarded = [];

	/**
	 * table used by the model
	 */
	protected $table = 'posts';

	/**
	 * Post has many comments
	 * Returns all comments for the post
	 *
	 * @return \Illuminate\Database\Eloquent\Relations\HasMany
	 */
	public function comments()
	{
		return $this->hasMany(Comment::class, 'on_post');
	}

	/**
	 * Returns the instance of the user who is author of that post
	 *
	 * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
	 */
	public function author()
	{
		return $this->belongsTo(User::class, 'author_id');
	}
}
