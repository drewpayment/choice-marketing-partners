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
    	return $this->belongsTo(User::class, 'from_user');
    }
}
