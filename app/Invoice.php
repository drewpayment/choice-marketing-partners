<?php

namespace App;

use Illuminate\Database\Eloquent\Model;

class Invoice extends Model
{
    /**
	 * The attributes that are mass assignable.
	 *
	 * @var array
	 */
	protected $fillable = [
		'id', 'sale_date', 'first_name', 'last_name', 'address', 'city', 'status', 'amount', 'agent', 'issue_date', 'created_at', 'updated_at'
	];
}
