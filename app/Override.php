<?php

namespace App;

use Illuminate\Database\Eloquent\Model;

class Override extends Model
{

	protected $fillable = [
		'id',
		'name',
		'sales',
		'commission',
		'total',
		'agentid',
		'issue_date',
		'wkending',
		'created_at',
		'updated_at'
	];

}
