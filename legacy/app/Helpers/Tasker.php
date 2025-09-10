<?php
/**
 * Created by PhpStorm.
 * User: drewpayment
 * Date: 9/20/17
 * Time: 9:07 PM
 */

namespace App\Helpers;


use Carbon\Carbon;

class Tasker {


	public static function processInvoiceData()
	{
		$today = new Carbon();
		$nextPaydate = $today->next(Carbon::WEDNESDAY);
	}

}