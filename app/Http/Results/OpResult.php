<?php

namespace App\Http\Results;

use App\Helpers\Utilities;
use Illuminate\Http\JsonResponse;

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

	/**
	 * @param OpResult $op
	 *
	 * @return $this
	 */
	public function mergeInto(OpResult &$op): OpResult
    {
        $op->status = $this->status;
        $op->httpStatus = $this->httpStatus;
        $op->messages = array_merge($this->messages, $op->messages);
        // Changing to return the var passed by ref into this method
	    // Don't think it is supposed to return this class instead...
		// return $this;
		return $op;
    }

	/**
	 * @param $fn
	 * @param array $params
	 *
	 * @return $this
	 */
	public function trySetData($fn, $params = []): OpResult
    {
        if (!is_callable($fn))
        {
            $this->setToFail('Bad request. Malformed expression.');
        }
        $fnDataResult = call_user_func_array($fn, $params);
        if (!$fnDataResult) return $this->setToFail('Query expression failed.');
        return $this->setData($fnDataResult);
    }

	/**
	 * @return mixed|null
	 */
	public function getData()
    {
        return $this->data;
    }

	/**
	 * Serializes data inside of the OpResult and returns it.
	 *
	 * @return JsonResponse
	 */
    public function getResponse(): JsonResponse {
        $body = is_null($this->data) ? $this->messages : $this->data;
        return response()->json($body, $this->httpStatus);
    }

	/**
	 * @param $value
	 *
	 * @return $this
	 */
	public function setData($value): OpResult
    {
        $this->data = $this->utilities->encodeJson($value);

        if ($this->data != null)
        {
            return $this->setToSuccess();
        }
        return $this->setToFail();
    }

	/**
	 * @param $data
	 *
	 * @return $this
	 */
	public function setDataOnSuccess($data): OpResult
    {
        if ($data != null && $this->status == StatusType::Success) 
        {
            return $this->setData($data);
        }
        return $this;
    }

	/**
	 * @param $msg
	 *
	 * @return $this
	 */
	public function setMessage($msg): OpResult
    {
        if ($msg == null) return $this;
        $this->messages[] = $msg;
        return $this;
    }

	/**
	 * @param null $msg
	 * @param int $httpStatus
	 *
	 * @return $this
	 */
	public function setToFail($msg = null, int $httpStatus = HttpStatus::BadRequest): OpResult
    {
        $this->httpStatus = $httpStatus;
        $this->status = StatusType::Fail;
        if ($msg != null) $this->messages[] = $msg;
        return $this;
    }

	/**
	 * @return $this
	 */
	public function setToSuccess(): OpResult
    {
        $this->httpStatus = HttpStatus::Ok;
        $this->status = StatusType::Success;
        return $this;
    }

	/**
	 * @return bool
	 */
	public function hasError(): bool
    {
        return $this->status != StatusType::Success;
    }

	/**
	 * @param $data
	 * @param string $msg
	 *
	 * @return $this
	 */
	public function checkNull($data, $msg = 'Resource not found.'): OpResult
	{
		if ($data == null)
		{
			$this->setToFail($msg);
		}

		return $this;
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