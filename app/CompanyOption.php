<?php

namespace App;

use Illuminate\Database\Eloquent\Model;

class CompanyOption extends Model
{

    protected $primaryKey = 'id';

    protected $table = 'company_options';

    protected $fillable = ['id', 'has_paystub_notifications'];

    public function setHasPaystubNotificatonsAttribute($value)
    {
    	$this->attributes['has_paystub_notifications'] = $value ? 1 : 0;
    }

	public function getHasPaystubNotificationsAttribute(): bool
	{
		return $this->attributes['has_paystub_notifications'] == 1;
	}

}
