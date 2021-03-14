<?php

namespace App;

use DateTimeInterface;
use Illuminate\Database\Eloquent\Model;

class Vendor extends Model
{
    /**
     * table used by model
     */
    protected $table = 'vendors';

    /**
     * mass assignable fields
     */
    protected $fillable = ['id', 'name', 'is_active'];

    /**
     * scope query order by name, ascending
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeOrderByName($query)
    {
    	return $query->orderBy('name', 'asc');
    }

    /**
     * scope query to active vendors only
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @return \Illuminate\Database\Eloquent\Builder
     */
	public function scopeActive($query)
	{
		return $query->where('is_active', 1);
	}

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
