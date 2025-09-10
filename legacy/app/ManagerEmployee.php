<?php

namespace App;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ManagerEmployee extends Model
{
    use HasFactory;

    protected $primaryKey = 'id';

    protected $fillable = [
      'manager_id',
      'employee_id',
      'created_at',
      'updated_at',
    ];

    public function __construct()
    {
    }

    public function manager()
    {
      return $this->belongsTo(Employee::class, 'manager_id');
    }

    public function employee()
    {
      return $this->hasOne(Employee::class, 'employee_id');
    }
}
