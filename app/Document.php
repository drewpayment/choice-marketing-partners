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
		'doc_id',
		'name',
		'description',
		'uploaded_by'
	];

}
