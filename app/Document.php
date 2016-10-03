<?php

namespace App;

use Illuminate\Database\Eloquent\Model;

class Document extends Model
{

	/**
	 * Database table used by the model.
	 *
	 * @var string
	 */
	protected $table = 'documents';

	/**
	 * Mass assignable attributes.
	 *
	 * @var array
	 */
	protected $fillable = [
		'name',
		'description',
		'mime_type',
		'uploaded_by'
	];

}
