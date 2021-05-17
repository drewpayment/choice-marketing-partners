<?php

namespace App\Http\Controllers;

use App\CompanyOption;
use App\Http\Results\OpResult;
use App\Paystub;
use App\Services\PaystubService;
use App\Services\SessionUtil;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminSettingsController extends Controller
{
	protected $session;
	protected $paystubs;

	public function __construct(SessionUtil $_session, PaystubService $_paystubs)
	{
		$this->session = $_session;
		$this->paystubs = $_paystubs;
	}

	/**
	 * @return JsonResponse
	 */
	public function getCompanyOptions(): JsonResponse
	{
		$result = new OpResult();

		$this->session->checkUserIsAdmin()->mergeInto($result);

		if ($result->hasError())
		{
			return $result->getResponse();
		}

		$options = CompanyOption::all()->first();

		$result->setData($options);

		return $result->getResponse();
	}

	public function updateCompanyOptions(Request $request): JsonResponse
	{
		$result = new OpResult();

		$this->session->checkUserIsAdmin()->mergeInto($result);

		if ($result->hasError())
		{
			return $result->getResponse();
		}

		$option = CompanyOption::all()->first();

		$option->has_paystub_notifications = $request->input('hasPaystubNotifications');

		$isSaved = $option->save();

		if (!$isSaved)
		{
			$result->setToFail('Failed to update.');
		}
		else
		{
			$result->setData($option);
		}

		return $result->getResponse();
	}

    /**
     * Display a listing of the resource.
     *
     * @return JsonResponse
     */
    public function getPayrollDates(): JsonResponse
    {
        $result = new OpResult();

        $this->session->checkUserIsAdmin()->mergeInto($result);

        if ($result->hasError())
        {
        	return $result->getResponse();
        }

	    $dates = Paystub::all()->unique('issue_date');

	    $dates = $dates->values()->sortByDesc(function($d) {
		    return $d->issue_date;
	    })->pluck('issue_date')->take(10)->toArray();

	    $result->setData($dates);

	    return $result->getResponse();
    }

	/**
	 * @param Request $request
	 *
	 * @return JsonResponse
	 * @throws \Exception
	 */
	public function calculatePayroll(Request $request): JsonResponse
	{
		$result = new OpResult();
		$date = $request->input('date');

		$this->session->checkUserIsAdmin()->mergeInto($result);

		try
		{
			DB::beginTransaction();

			$this->paystubs->processPaystubJob($date);

			DB::commit();
		}
		catch (\Exception $e)
		{
			DB::rollback();
			$result->setToFail('Failed to process. Please try again later.');
		}

		return $result->getResponse();
	}

}
