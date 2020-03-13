<?php

namespace App\Services;

use App\User;
use App\Employee;

class SessionUtil
{

    public function __construct()
    {
    }

    public function getUserSubordinates($userId)
    {
        $user = User::with('employee')->userId($userId)->first();
        $list = $user->employee->permissions()->active()->get(['emp_id'])->pluck('emp_id');
        $agents = collect([$user->employee]);

        if ($list->isNotEmpty()) {
            $ees = Employee::agentId($list->all())->get();
            $agents = $agents->concat($ees);
        }

        return $agents;
    }

    public function fromCamelCase($input)
    {
        $result = [];

        foreach ($input as $key => $value)
        {
            $convertedKey = mb_strtolower(preg_replace('%(?<!^)\p{Lu}%usD', '_$0', $key), 'utf-8');
            $result[$convertedKey] = $value;
        }

        return $result;
    }
}
