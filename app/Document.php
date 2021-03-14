<?php

namespace App;

use Conner\Tagging\Taggable;
use DateTimeInterface;
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
