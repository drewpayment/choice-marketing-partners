<?php

namespace App;

use Illuminate\Database\Eloquent\Model;

class Employee extends Model
{
	/**
	 * The attributes that are mass assignable.
	 *
	 * @var array
	 */
	protected $fillable = [
		'name', 'address', 'phone_no', 'email', 'sales_id1', 'sales_id2', 'sales_id3'
	];
}
