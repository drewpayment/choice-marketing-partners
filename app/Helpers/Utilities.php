<?php

namespace App\Helpers;

use Illuminate\Support\Str;
use Illuminate\Contracts\Support\Arrayable;

class Utilities 
{

    /**
     * Encode a value to camelCase JSON
     */
    public function encodeJson($value)
    {
        if ($value instanceof Arrayable) {
            return $this->encodeArrayable($value);
        } 
        
        if (is_array($value)) {
            return $this->encodeArray($value);
        } 
        
        if (is_object($value)) {
            return $this->encodeArray((array)$value);
        } 
        
        return $value;
    }

    /**
     * Encode a arrayable
     */
    public function encodeArrayable($arrayable)
    {
        $array = $arrayable->toArray();
        return $this->encodeJson($array);
    }

    /**
     * Encode an array
     */
    public function encodeArray($array)
    {
        $newArray = [];
        foreach ($array as $key => $val) {
            $newArray[Str::camel($key)] = $this->encodeJson($val);
        }
        return $newArray;
    }

}