<?php

namespace App;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserNotification extends Model
{
    protected $primaryKey = 'id';

    protected $table = 'user_notifications';

    protected $fillable = ['id', 'user_id', 'employee_id', 'has_paystub_notifier',
	    'paystub_notifier_type', 'notifier_destination', 'created_at', 'updated_at'];

    public function setHasPaystubNotifierAttribute($value)
    {
    	$this->attributes['has_paystub_notifier'] = $value ? 1 : 0;
    }

	public function getHasPaystubNotifierAttribute(): bool
	{
		return $this->attributes['has_paystub_notifier'] == 1;
	}

	/**
	 * Get the user that owns this notification record.
	 *
	 * @return BelongsTo
	 */
	public function user(): BelongsTo
	{
		return $this->belongsTo(User::class, 'user_id', 'uid');
	}
}
