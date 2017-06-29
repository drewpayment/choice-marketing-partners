<?php

namespace App;

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
    protected $fillable = ['name'];

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

}
