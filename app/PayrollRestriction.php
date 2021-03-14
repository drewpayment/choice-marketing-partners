<?php

namespace App;

use DateTimeInterface;
use Illuminate\Database\Eloquent\Model;

class PayrollRestriction extends Model
{
    /**
     * table to be used by the model
     */
	protected $table = 'payroll_restriction';

    /**
     * mass assignable fields on the table
     */
	protected $fillable = ['id', 'hour', 'minute', 'modified_by'];

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
