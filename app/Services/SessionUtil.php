<?php

namespace App\Services;

use App\User;
use App\Employee;
use App\Http\Results\OpResult;

class SessionUtil
{

    public function __construct()
    {
    }

    /**
     * Poorly named method and even more poorly named parameter since the parameter is actually the PK from the Employee table.
     */
    public function getUserSubordinates($userId)
    {
      $manager = Employee::with('managedEmployees')->find($userId);
      $agents = array_merge([$manager], $manager->managedEmployees->toArray());

      return collect($agents);
    }

    /**
     * I'm awful at regex in PHP. Humbly stolen from:
     * https://stackoverflow.com/questions/40514051/using-preg-replace-to-convert-camelcase-to-snake-case
     *
     * @param array $input Map of inputs from HTTP call
     * @param string $us Separator when converting from camel case
     * @return void
     */
    public function fromCamelCase($input, $us = '_')
    {
        $result = [];

        foreach ($input as $key => $value)
        {
            // insert hyphen between any letter and the beginning of a numeric chain
            $string = preg_replace('/([a-z]+)([0-9]+)/i', '$1'.$us.'$2', $key);
            // insert hyphen between any lower-to-upper-case letter chain
            $string = preg_replace('/([a-z]+)([A-Z]+)/', '$1'.$us.'$2', $string);
            // insert hyphen between the end of a numeric chain and the beginning of an alpha chain
            $string = preg_replace('/([0-9]+)([a-z]+)/i', '$1'.$us.'$2', $string);

            // Lowercase
            $string = strtolower($string);

            $result[$string] = $value;

            // This wasn't handling numerics
            // $convertedKey = mb_strtolower(preg_replace('%(?<!^)\p{Lu}%usD', '_$0', $key), 'utf-8');
            // $result[$convertedKey] = $value;
        }

        return $result;
    }

    public function checkUserIsAdmin()
    {
        $result = new OpResult();

        $user = auth()->user();
        $isAdmin = $user->employee != null ? $user->employee->is_admin : false;

        if (!$isAdmin)
            return $result->setToFail('Unauthorized.');

        return $result;
    }
}
