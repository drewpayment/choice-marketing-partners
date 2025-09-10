<?php

namespace App;

use Conner\Tagging\Taggable;
use Illuminate\Database\Eloquent\Model;

class Document extends Model
{
	use Taggable;

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
