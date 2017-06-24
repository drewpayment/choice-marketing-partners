<?php

namespace App;

use Illuminate\Database\Eloquent\Model;

class Expense extends Model
{

	/**
	 * table used by model
	 *
	 * @var string
	 */
    protected $table = 'expenses';


    /**
     * mass assignable fields
     */
    protected $fillable = ['expid', 'type', 'amount', 'notes', 'agentid', 'issue_date', 'wkending'];


    /**
     * scope query filter by agent id
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @param int
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeAgentId($query, $id)
    {
    	return $query->where('agentid', $id);
    }


    /**
     * scope query filter by issue date
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @param date
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeIssueDate($query, $date)
    {
    	return $query->where('issue_date', $date);
    }

}