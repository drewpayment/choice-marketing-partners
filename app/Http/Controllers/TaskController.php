<?php

namespace App\Http\Controllers;

use App\Http\Results\OpResult;
use App\Task;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;

class TaskController extends Controller
{
    /**
     * Display a listing of the resource.
     *
     * @return JsonResponse
     */
    public function index(): JsonResponse
    {
    	$result = new OpResult();
        $user = Auth::user();
        $user->load('assignedTasks');

        if ($user != null)
	        $result->setData($user->assignedTasks);

        return $result->getResponse();
    }

    /**
     * Store a newly created resource in storage.
     *
     * @param Request $request
     *
     * @return Response
     */
    public function store(Request $request): Response
    {
        //
    }

    /**
     * Display the specified resource.
     *
     * @param Task $task
     *
     * @return Response
     */
    public function show(Task $task): Response
    {
        //
    }

    /**
     * Update the specified resource in storage.
     *
     * @param Request $request
     * @param Task $task
     *
     * @return Response
     */
    public function update(Request $request, Task $task): Response
    {
        //
    }

    /**
     * Remove the specified resource from storage.
     *
     * @param Task $task
     *
     * @return Response
     */
    public function destroy(Task $task): Response
    {
        //
    }
}
