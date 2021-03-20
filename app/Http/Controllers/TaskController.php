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
     * @return JsonResponse
     */
    public function store(Request $request): JsonResponse
    {
    	$result = new OpResult();

        $task = new Task([
        	'title' => $request->input('title'),
	        'notes' => $request->input('notes'),
	        'due_date' => $request->input('dueDate'),
	        'is_complete' => false,
	        'created_by_user_id' => $request->user()->id,
	        'assigned_to_user_id' => $request->user()->id
        ]);

        $isSuccess = $task->save();

        if ($isSuccess)
        {
	        $result->setData($task);
        }
	    else
	    {
	    	$result->setToFail('Failed to save.');
	    }

	    return $result->getResponse();
    }

    /**
     * Update the specified resource in storage.
     *
     * @param Request $request
     * @param Task $task
     *
     * @return JsonResponse
     */
    public function update(Request $request, Task $task): JsonResponse
    {
        $result = new OpResult();

        $t = Task::byTaskId($task->id)->first();

        if ($t == null)
        {
            $result->setToFail('Resource not found.');
            return $result->getResponse();
        }

        if ($task->title != $t->title)
        	$t->title = $task->title;

        if ($task->notes != $t->notes)
        	$t->notes = $task->notes;

        if ($task->due_date != $t->due_date)
        	$t->due_date = $task->due_date;

        if ($task->is_complete != $t->is_complete)
        	$t->is_complete = $task->is_complete;

        if ($task->assigned_to_user_id != $t->assigned_to_user_id)
        	$t->assigned_to_user_id = $task->assigned_to_user_id;

        $saved = $t->save();

        if ($saved)
        {
        	$result->setData($t);
        }
	    else
	    {
	    	$result->setToFail('Failed to save');
	    }

	    return $result->getResponse();
    }

	/**
	 * Remove the specified resource from storage.
	 *
	 * @param int $taskId
	 *
	 * @return JsonResponse
	 */
    public function delete(int $taskId): JsonResponse
    {
        $result = new OpResult();

        $task = Task::byTaskId($taskId)->first();

		$result->checkNull($task);

		$del = $task->destroy();

		if ($del)
		{
			return $result->setToSuccess()->getResponse();
		}

	    return $result->setToFail('Failed to delete resource.')
		    ->getResponse();
    }
}
