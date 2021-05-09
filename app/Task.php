<?php

namespace App;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Task extends Model
{
    use HasFactory;

    protected $table = 'tasks';

    protected $primaryKey = 'id';

    protected $fillable = ['id', 'title', 'notes', 'due_date', 'is_complete', 'created_by_user_id', 'assigned_to_user_id', 'created_at', 'updated_at'];

    #region Filters

	/**
	 * @param Builder $query
	 * @param int $taskId
	 *
	 * @return Builder
	 */
	public function scopeByTaskId(Builder $query, int $taskId): Builder
	{
		return $query->where('id', $taskId);
	}

	/**
	 * @param Builder $query
	 * @param int $userId
	 *
	 * @return Builder
	 */
	public function scopeByCreatedUserId(Builder $query, int $userId): Builder
	{
		return $query->where('created_by_user_id', $userId);
	}

	/**
	 * @param Builder $query
	 * @param int $userId
	 *
	 * @return Builder
	 */
	public function scopeByAssignedToUserId(Builder $query, int $userId): Builder
	{
		return $query->where('assigned_to_user_id', $userId);
	}

	#endregion

    #region Relationships

	/**
	 * @return BelongsTo
	 */
	public function taskCreator(): BelongsTo
	{
		return $this->belongsTo(User::class, 'uid');
	}

	/**
	 * @return BelongsTo
	 */
	public function taskAssignee(): BelongsTo
	{
		return $this->belongsTo(User::class, 'uid');
	}

	#endregion

    #region Mutators

	public function getIsCompleteAttribute(): bool
	{
		return $this->attributes['is_complete'] == 1;
	}

	public function setIsCompleteAttribute(bool $value)
	{
		$this->attributes['is_complete'] = $value ? 1 : 0;
	}

	public function setDueDateAttribute($value)
	{
		$this->attributes['due_date'] = Carbon::parse($value);
	}

	public function getDueDateAttribute(): \DateTime
	{
		return Carbon::parse($this->attributes['due_date'])->toDate();
	}

	#endregion

	#region Helpers



	#endregion
}
