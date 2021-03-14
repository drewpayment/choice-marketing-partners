<?php

namespace App;

use DateTimeInterface;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserFeature extends Model
{
    #region TABLE PROPERTIES

	protected $table = 'user_features';

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

	#region ATTRIBUTE MUTATORS

	public function getHasNewUiAttribute()
	{
		return $this->attributes['has_new_ui'] == 1;
	}

	public function setHasNewUiAttribute($value)
	{
		$this->attributes['has_new_ui'] = $value ? 1 : 0;
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
