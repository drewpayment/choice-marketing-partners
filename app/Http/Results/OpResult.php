<?php

namespace App\Http\Results;

use App\Helpers\Utilities;

class OpResult 
{
    protected $data;
    protected $status = StatusType::Success;
    protected $httpStatus = HttpSTatus::Ok;
    protected $messages = [];
    protected $utilities;

    public function __construct($data = null)
    {
        $this->data = $data;
        $this->utilities = new Utilities();
    }

    public function mergeInto(OpResult &$op)
    {
        $op->status = $this->status;
        $op->httpStatus = $this->httpStatus;
        $op->messages = array_merge($this->messages, $op->messages);
        return $this;
    }

    public function trySetData($fn, $params = [])
    {
        if (!is_callable($fn))
        {
            $this->setToFail('Bad request. Illformed expression.');
        }
        $fnDataResult = call_user_func_array($fn, $params);
        if (!$fnDataResult) return $this->setToFail('Query expression failed.');
        return $this->setData($fnDataResult);
    }

    public function getData()
    {
        return $this->data;
    }

    public function getResponse()
    {
        return response()->json($this->data, $this->httpStatus);
    }

    public function setData($value)
    {
        $this->data = $this->utilities->encodeJson($value);

        if ($this->data != null)
        {
            return $this->setToSuccess();
        }
        return $this->setToFail();
    }

    public function setDataOnSuccess($data)
    {
        if ($data != null && $this->status == StatusType::Success) 
        {
            return $this->setData($data);
        }
        return $this;
    }

    public function setMessage($msg)
    {
        if ($msg == null) return $this;
        $this->messages[] = $msg;
        return $this;
    }

    public function setToFail($msg = null, int $httpStatus = HttpStatus::BadRequest)
    {
        $this->httpStatus = $httpStatus;
        $this->status = StatusType::Fail;
        if ($msg != null) $this->messages[] = $msg;
        return $this;
    }

    public function setToSuccess()
    {
        $this->httpStatus = HttpStatus::Ok;
        $this->status = StatusType::Success;
        return $this;
    }

    public function hasError()
    {
        return $this->status != StatusType::Success;
    }
}

abstract class StatusType
{
    const Success = true;
    const Fail = false;
}

abstract class HttpStatus
{
    const Ok = 200;
    const BadRequest = 400;
    const Unauthorized = 401;
    const MethodNotAllowed = 405;
    const ServerError = 500;
}