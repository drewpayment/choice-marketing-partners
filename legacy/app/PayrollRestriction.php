<?php

namespace App;

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


}
