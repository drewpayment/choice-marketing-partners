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
            $this->setToFail('Bad request. Malformed expression.');
        }
        $fnDataResult = call_user_func_array($fn, $params);
        if (!$fnDataResult) return $this->setToFail('Query expression failed.');
        return $this->setData($fnDataResult);
    }

    public function getData()
    {
        return $this->data;
    }

	/**
	 * Serializes data inside of the OpResult and returns it.
	 *
	 * @return JsonResponse
	 */
    public function getResponse(): JsonResponse
    {
        $body = is_null($this->data) ? $this->messages : $this->data;
        return $this->isJson($body)
	        ? response()->json($body, $this->httpStatus)
	        : response()->json('[]', $this->httpStatus);
    }

	/**
	 * @param $value
	 *
	 * @return bool
	 */
	private function isJson($value): bool
	{
		try
		{
			json_decode($value);
		}
		catch (\Exception $e)
		{
			// silence is golden
		}
		return json_last_error() === JSON_ERROR_NONE;
	}

	/**
	 * Set data on the opresult for HTTP consumption and delivery to Angular
	 * as JsonResponse.
	 *
	 * @param $value
	 * @param bool $with_status Updates the OpResult success status by default
	 *
	 * @return $this
	 */
	public function setData($value, bool $with_status = true): OpResult
    {
        $this->data = $this->utilities->encodeJson($value);

        if ($with_status)
        {
	        if ($this->data != null)
	        {
		        return $this->setToSuccess();
	        }
	        return $this->setToFail();
        }

	    return $this;
    }

	/**
	 * Set data on the opresult as the raw value, this cannot produce a
	 * JsonResponse.
	 *
	 * @param $value
	 *
	 * @return $this
	 */
	public function setRawData($value): OpResult
	{
		$this->data = $value;
		return $this;
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