<?php

namespace App;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserFeature extends Model
{
    #region TABLE PROPERTIES

	protected $table = 'user_feature';

	protected $primaryKey = 'id';

	protected $fillable = ['user_id', 'has_new_ui', 'created_at', 'updated_at'];

	#endregion

	#region RELATIONSHIPS

	/**
	 * Belongs to a user.
	 *
	 * @return BelongsTo
	 */
	public function user(): BelongsTo
	{
		return $this->belongsTo(User::class);
	}

	#endregion
}
