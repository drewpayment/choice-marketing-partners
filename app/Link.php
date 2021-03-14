<?php

namespace App;

use Conner\Tagging\Taggable;
use DateTimeInterface;
use Illuminate\Database\Eloquent\Model;

class Link extends Model
{
    use Taggable;

    protected $table = 'links';

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
