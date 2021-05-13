<?php

namespace App\Http\Controllers;

use App\Http\Results\OpResult;
use App\Services\SessionUtil;
use App\UserNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UserNotificationController extends Controller
{
	protected $session;

	public function __construct(SessionUtil $_session)
	{
		$this->session = $_session;
	}

    /**
     * Display a listing of the resource.
     *
     * @return JsonResponse
     */
    public function index($userId)
    {
        $result = new OpResult();

        $this->session->checkUserIsAdmin()->mergeInto($result);

        if ($result->hasError())
        	return $result->getResponse();

        $result->setData(UserNotification::where('user_id', $userId)->first());

        return $result->getResponse();
    }

    /**
     * Store a newly created resource in storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\Response
     */
    public function store(Request $request)
    {
        //
    }

    /**
     * Display the specified resource.
     *
     * @param  \App\UserNotification  $userNotification
     * @return \Illuminate\Http\Response
     */
    public function show(UserNotification $userNotification)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \App\UserNotification  $userNotification
     * @return \Illuminate\Http\Response
     */
    public function update(Request $request, UserNotification $userNotification)
    {
        //
    }

    /**
     * Remove the specified resource from storage.
     *
     * @param  \App\UserNotification  $userNotification
     * @return \Illuminate\Http\Response
     */
    public function destroy(UserNotification $userNotification)
    {
        //
    }
}
