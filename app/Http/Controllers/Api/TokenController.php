<?php


namespace App\Http\Controllers\Api;


use App\Http\Results\OpResult;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class TokenController
{

	/**
	 * @param Request $request
	 *
	 * @return JsonResponse
	 */
	public function login(Request $request): JsonResponse
	{
		$result = new OpResult();
		$userId = $request->input('userId');
		$authUser = Auth::loginUsingId($userId);

		if ($authUser != null)
		{
			$authUser->load('employee');
		}

		$result->setData($authUser);

		if ($result->hasError())
		{
			$result->setMessage('User is not authenticated.');
		}

		return $result->getResponse();
	}

}