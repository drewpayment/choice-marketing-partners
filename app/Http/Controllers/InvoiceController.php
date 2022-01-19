<?php

namespace App\Http\Controllers;

use DateTime;
use Exception;
use App\Vendor;
use App\Expense;
use App\Invoice;
use App\Payroll;
use App\Paystub;
use App\Employee;
use App\Override;
use Carbon\Carbon;
use App\Services\DbHelper;
use App\PayrollRestriction;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Mail\Mailable;
use App\Helpers\InvoiceHelper;
use App\Helpers\Utilities;
use App\Http\Results\OpResult;
use App\Plugins\Facade\PDF;
use App\Services\InvoiceService;
use App\Services\PaystubService;
use App\Services\SessionUtil;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Input;
use Illuminate\Support\Facades\Storage;
use Doctrine\DBAL\Driver\Mysqli\MysqliException;
use Illuminate\View\View;

class InvoiceController extends Controller
{
	protected $dbHelper;
	protected $invoiceHelper;
	protected $invoiceService;
	protected $paystubService;
	protected $session;

	/**
	 * Middleware and helpers wiring
	 *
	 * @param InvoiceHelper $_invoiceHelper
	 * @param InvoiceService $invoice_service
	 * @param PaystubService $paystub_service
	 * @param SessionUtil $_session
	 */
	public function __construct(InvoiceHelper $_invoiceHelper, InvoiceService $invoice_service, PaystubService $paystub_service, SessionUtil $_session)
	{
		$this->middleware('auth');
		$this->invoiceHelper = $_invoiceHelper;
		$this->invoiceService = $invoice_service;
		$this->paystubService = $paystub_service;
		$this->session = $_session;
	}


	/**
	 * The search for paystubs page.
	 *
	 * @return View
	 */
	public function index(): View
	{
		$result = $this->getInvoiceSearchParams();

		return view('invoices.upload', [
			'emps' => $result['agents'],
			'weds' => $result['issueDates'],
			'vendors' => $result['vendors']
		]);
	}

	#region API CALLS

	/**
	 * Gets params to search for paystubs, serializes and returns them to Angular.
	 *
	 * @return JsonResponse
	 */
	public function getInvoicePageResources(): JsonResponse
	{
		$res = $this->getInvoiceSearchParams();
		return response()->json($res);
	}

	/**
	 * Gets the infomation necessary to search for paystubs.
	 *
	 * @return array
	 */
	private function getInvoiceSearchParams(): array
	{
		$emps = Employee::active()->hideFromPayroll()->orderByName()->get();
		$vendors = Vendor::active()->get();
		$wedArr = [];

		for ($i = 0; $i < 6; $i++) {
			$dt = Carbon::parse('this wednesday');
			$tmpDt = $dt->addWeek($i);
			$wedArr[] = $tmpDt->format('m-d-Y');
		}

		return [
			'agents' => $emps,
			'vendors' => $vendors,
			'issueDates' => $wedArr
		];
	}


	/**
	 * Save invoice via ajax --- new module
	 *
	 * @param Request $request
	 *
	 * @return JsonResponse
	 * @deprecated
	 */
	public function SaveInvoice(Request $request): JsonResponse
	{
		if (!request()->ajax())
			return response()->json(false);

		$input = json_decode($request->all()['input'], true);
		$result = $this->invoiceService->saveInvoice($input);

		return response()->json($result);
	}

	/**
	 * Replaces UploadInvoice()
	 * Saves from editing an invoice.
	 *
	 * @param Request $request
	 *
	 * @return JsonResponse
	 */
	public function saveApiInvoice(Request $request): JsonResponse
	{
		$result = new OpResult();
		DB::beginTransaction();

		try {
			$this->deletePendingInvoiceItems($request['pendingDeletes']);
			$sales = $this->saveSaleRecords($request)->getData();
			$overrides = $this->saveOverrideRecords($request)->getData();
			$expenses = $this->saveExpenseRecords($request)->getData();

			$payroll = $this->savePayrollInfo($request, $sales, $overrides, $expenses)->getData();

			$this->paystubService->processPaystubJob($request['issueDate']);
			
			DB::commit();

			return $result->setData([
				'sales' => $sales,
				'overrides' => $overrides,
				'expenses' => $expenses,
				'payroll' => $payroll
			])->getResponse();
			
		} catch (\Exception $ex) {
			DB::rollBack();

			return $result->setToFail($ex)
				->getResponse();
		}
	}
	
	#region API INVOICE PRIVATE METHODS

	private function savePayrollInfo($request, $sales, $overrides, $expenses)
	{
		$result = new OpResult();
		$total = 0;

		foreach ($sales as $sale) {
			$total += $sale['amount'];
		}

		foreach ($overrides as $override) {
			$total += $override['total'];
		}

		foreach ($expenses as $expense) {
			$total += $expense['amount'];
		}

		$payroll = Payroll::agentId($request['agentid'])
			->vendor($request['vendorId'])
			->payDate($request['issueDate'])
			->first();

		if ($payroll != null) {
			$payroll->amount = $total;
		} else {
			$agent = Employee::find($request['agentid']);

			$payroll = new Payroll([
				'agent_id' => $request['agentId'],
				'agent_name' => $agent != null ? $agent->name : '',
				'amount' => $total,
				'is_paid' => false,
				'vendor_id' => $request['vendorId'],
				'pay_date' => $request['issueDate']
			]);
		}

		$saved = $payroll->save();

		return $result->setStatus($saved)
			->setDataOnSuccess($payroll);
	}

	private function saveExpenseRecords($request)
	{
		$result = new OpResult();
		$expenses = [];

		foreach ($request['expenses'] as $e) {
			$expense = Expense::firstOrNew([ 'expid' => $e['expenseId'] ]);
			
			$expense->vendor_id = $request['vendorId'];
			$expense->agentid = $request['agentId'];
			$expense->issue_date = $request['issueDate'];
			$expense->wkending = $request['weekending'];
			$expense->amount = is_numeric($e['amount']) ? $e['amount'] + 0 : 0;
			$expense->type = $e['type'];			
			$expense->notes = $e['notes'];
			
			if ($expense->expid < 0) {
				$expense->expid = null;
			}

			$save_success = $expense->save();

			if ($save_success) {
				$expenses[] = $expense;
			}
		}

		return $result->setDataOnSuccess($expenses);
	}

	private function saveOverrideRecords($request)
	{
		$result = new OpResult();
		$overrides = [];

		foreach ($request['overrides'] as $o) {
			$override = Override::firstOrNew([
				'vendor_id' => $request['vendorId'],
				'sales' => $o['sales'],
				'commission' => is_numeric($o['commission']) ? $o['commission'] + 0 : 0,
				'total' => is_numeric($o['total']) ? $o['total'] + 0 : 0,
				'agentid' => $request['agentId'],
				'issue_date' => $request['issueDate'],
				'wkending' => $request['weekending']
			]);
			
			$override->name = $o['name'];

			$save_success = $override->save();

			if ($save_success) {
				$overrides[] = $override;
			}
		}

		return $result->setDataOnSuccess($overrides);
	}

	private function saveSaleRecords($request)
	{
		$result = new OpResult();

		$sales = [];
		foreach ($request['sales'] as $invoice) {
			$sale = Invoice::firstOrNew([
				'invoice_id' => $invoice['invoiceId']
			]);
			
			$sale->vendor = $request['vendorId'];
			$sale->sale_date = Carbon::parse($invoice['saleDate'])->format('Y-m-d');
			$sale->first_name = $invoice['firstName'];
			$sale->last_name = $invoice['lastName'];
			$sale->address = $invoice['address'];
			$sale->city = $invoice['city'];
			$sale->status = $invoice['status'];
			$sale->amount = is_numeric($invoice['amount']) ? $invoice['amount'] + 0 : 0;
			$sale->agentid = $request['agentId'];
			$sale->issue_date = $request['issueDate'];
			$sale->wkending = $request['weekending'];
			
			if ($sale->invoice_id < 1) {
				$sale->invoice_id = null;
			}

			$save_success = $sale->save();

			if ($save_success) {
				$sales[] = $sale;
			}
		}

		return $result->setDataOnSuccess($sales);
	}
	
	private function deletePendingInvoiceItems($pending_deletes)
	{
		if (isset($pending_deletes['sales']) && count($pending_deletes['sales']) > 0) {
			Invoice::destroy($pending_deletes['sales']);
			$sales_ids = [];
			foreach ($pending_deletes['sales'] as $key => $value) {
				$sales_ids[] = $value['invoiceId'];
			}

			DB::table('invoices')->whereIn('invoice_id', $sales_ids)->delete();
		}

		if (isset($pending_deletes['overrides']) && count($pending_deletes['overrides']) > 0) {
			$override_ids = [];
			foreach ($pending_deletes['overrides'] as $key => $value) {
				$override_ids[] = $value['overrideId'];
			}

			DB::table('overrides')->whereIn('ovrid', $override_ids)->delete();
		}

		if (isset($pending_deletes['expenses']) && count($pending_deletes['expenses']) > 0) {
			$expense_ids = [];
			foreach ($pending_deletes['expenses'] as $key => $value) {
				$expense_ids[] = $value['expenseId'];
			}

			DB::table('expenses')->whereIn('expid', $expense_ids)->delete();
		}
	}
	
	#endregion

	/**
	 * @param Request $request
	 * @param $invoiceId
	 *
	 * @return JsonResponse
	 */
	public function deleteInvoiceRow(Request $request, $invoiceId): JsonResponse
	{
		$result = new OpResult();

		$this->session->checkUserIsAdmin()->mergeInto($result);

		if ($result->hasError()) {
			return $result->getResponse();
		}

		$deleted_count = Invoice::destroy($invoiceId);

		if ($deleted_count < 1) {
			return $result->setToFail('Failed to delete your invoice row.')
				->getResponse();
		}

		return $result->getResponse();
	}

	/**
	 * @param Request $request
	 *
	 * @return JsonResponse
	 */
	public function deleteInvoices(Request $request): JsonResponse
	{
		$result = new OpResult();

		$this->session->checkUserIsAdmin()->mergeInto($result);

		if ($result->hasError()) {
			return $result->getResponse();
		}

		$invoiceIdStr = $request->query('i');
		$invoiceIdArr = explode(',', $invoiceIdStr);

		$expected_delete_count = count($invoiceIdArr);

		$deleted_count = Invoice::destroy($invoiceIdArr);

		if ($expected_delete_count != $deleted_count) {
			return $result->setToFail('Something went wrong and we may not have been able to delete all of the expected records. Please refresh the page.')
				->getResponse();
		}

		return $result->getResponse();
	}

	#endregion

	/**
	 * Updates or Inserts new invoice records for a paystub.
	 * 
	 *  $pending = [
	 *       'sales' => $pending_sales,
	 *       'overrides' => $pending_overrides,
	 *       'expenses' => $pending_expenses,
	 *       'payroll' => $pending_payroll
	 *   ];
	 */
	private function updateOrInsertInvoices($pending)
	{
		foreach ($pending['sales'] as $sale) {
			$s = Invoice::find($sale['invoice_id']);

			if ($s == null) {
				$s = new Invoice;
			}

			$s->vendor = $sale['vendor'];
			$s->sale_date = $sale['sale_date'];
			$s->first_name = $sale['first_name'];
			$s->last_name = $sale['last_name'];
			$s->address = $sale['address'];
			$s->city = $sale['city'];
			$s->status = $sale['status'];
			$s->amount = $sale['amount'];
			$s->agentid = $sale['agentid'];
			$s->issue_date = $sale['issue_date'];
			$s->wkending = $sale['wkending'];
			$s->save();
		}

		foreach ($pending['overrides'] as $override) {
			$o = Override::find($override['ovrid']);

			if ($o == null) {
				$o = new Override;
			}

			$o->name = $override['name'];
			$o->vendor_id = $override['vendor_id'];
			$o->sales = $override['sales'];
			$o->commission = $override['commission'];
			$o->total = $override['total'];
			$o->agentid = $override['agentid'];
			$o->issue_date = $override['issue_date'];
			$o->wkending = $override['wkending'];
			$o->save();
		}

		foreach ($pending['expenses'] as $key => $expense) {
			$e = Expense::find($expense['expid']);

			if ($e == null) {
				$e = new Expense;
			}

			$e->vendor_id = intval($expense['vendor_id']);
			$e->type = $expense['type'];
			$e->amount = floatval($expense['amount']);
			$e->notes = $expense['notes'];
			$e->agentid = $expense['agentid'];
			$e->issue_date = $expense['issue_date'];
			$e->wkending = $expense['wkending'];
			$e->save();
		}
	}

	/**
	 * @param Request $request
	 * @param $vendor_id
	 * @param $agent_id
	 * @param $issue_date
	 * @param $week_ending
	 * @param $totals
	 *
	 * @return array
	 */
	private function mapToPendingInvoice(Request $request, $vendor_id, $agent_id, $issue_date, $week_ending, $totals): array
	{
		$now = Carbon::now()->format('Y-m-d H:i:s');

		$pending_sales = array_map(function ($sale) use ($agent_id, $issue_date, $week_ending, $vendor_id, $now) {
			return [
				'invoice_id' => isset($sale['invoiceId']) ? $sale['invoiceId'] : null,
				'vendor' => $vendor_id,
				'sale_date' => Carbon::parse($sale['saleDate'])->format('Y-m-d'),
				'first_name' => $sale['firstName'],
				'last_name' => $sale['lastName'],
				'address' => $sale['address'],
				'city' => $sale['city'],
				'status' => $sale['status'],
				'amount' => is_numeric($sale['amount']) ? $sale['amount'] + 0 : 0,
				'agentid' => $agent_id,
				'issue_date' => $issue_date,
				'wkending' => $week_ending,
				'created_at' => $now,
				'updated_at' => $now
			];
		}, $request['sales']);

		$pending_overrides = array_map(function ($ovr) use ($vendor_id, $agent_id, $issue_date, $week_ending, $now) {
			return [
				'ovrid' => isset($ovr['overrideId']) ? $ovr['overrideId'] : null,
				'vendor_id' => $vendor_id,
				'name' => $ovr['name'],
				'sales' => $ovr['sales'],
				'commission' => $ovr['commission'],
				'total' => is_numeric($ovr['total']) ? $ovr['total'] + 0 : 0,
				'agentid' => $agent_id,
				'issue_date' => $issue_date,
				'wkending' => $week_ending,
				'created_at' => $now,
				'updated_at' => $now
			];
		}, $request['overrides']);

		$pending_expenses = array_map(function ($exp) use ($vendor_id, $agent_id, $issue_date, $week_ending, $now) {
			return [
				'expid' => isset($exp['expenseId']) ? $exp['expenseId'] : null,
				'vendor_id' => $vendor_id,
				'type' => $exp['type'],
				'amount' => is_numeric($exp['amount']) ? $exp['amount'] + 0 : 0,
				'notes' => $exp['notes'],
				'agentid' => $agent_id,
				'issue_date' => $issue_date,
				'wkending' => $week_ending,
				'created_at' => $now,
				'updated_at' => $now
			];
		}, $request['expenses']);

		$paystub_total = $totals['sales'] + $totals['overrides'] + $totals['expenses'];
		$payroll_id = null;
		$payroll = Payroll::agentId($agent_id)->vendor($vendor_id)->payDate($issue_date)->first();
		if ($payroll != null) {
			$payroll_id = $payroll->id;
		}
		$agent = Employee::find($agent_id);

		$pending_payroll = [
			'id' => $payroll_id,
			'agent_id' => $agent_id,
			'agent_name' => $agent->name,
			'amount' => $paystub_total,
			'is_paid' => 0,
			'vendor_id' => $vendor_id,
			'pay_date' => $issue_date,
			'created_at' => $now,
			'updated_at' => $now
		];

		return [
			'sales' => $pending_sales,
			'overrides' => $pending_overrides,
			'expenses' => $pending_expenses,
			'payroll' => $pending_payroll
		];
	}


	/**
	 * Delete existing paystub.
	 *
	 * @param Request $request
	 *
	 * @return JsonResponse
	 */
	public function deletePaystub(Request $request): JsonResponse
	{
		$params = $request->all();
		$id = $params["id"];
		$vendor = $params["vendor"];
		$date = $params["date"];
		$date = date_create_from_format('m-d-Y', $date);
		$date = $date->format('Y-m-d');

		DB::beginTransaction();
		try {
			Invoice::agentId($id)->vendorId($vendor)->issueDate($date)->delete();
			Expense::agentId($id)->vendorId($vendor)->issueDate($date)->delete();
			Override::agentId($id)->vendorId($vendor)->issueDate($date)->delete();
			Paystub::agentId($id)->vendorId($vendor)->issueDate($date)->delete();

			DB::commit();
			$result = true;
		} catch (Exception $e) {
			DB::rollback();
			$result = false;
		}

		return response()->json($result);
	}


	public function OverridesModal()
	{
		return view('invoices.overridesmodal');
	}

	/**
	 * URL: /invoices/show-invoice/{agentID}/{vendorID}/{issueDate}
	 * Description:
	 * Paystub detail
	 *
	 * @param $agentID
	 * @param $vendorID
	 * @param $issueDate
	 *
	 * @return View
	 * @throws Exception
	 */
	public function editInvoice($agentID, $vendorID, $issueDate): View
	{
		if ($vendorID < 1)
			back()->withError('Missing campaign information. Please refresh the page and try again.')
				->withInput();

		$invoices = Invoice::agentId($agentID)->vendorId($vendorID)->issueDate($issueDate)->get();
		$overrides = Override::agentId($agentID)->vendorId($vendorID)->issueDate($issueDate)->get();
		$expenses = Expense::agentId($agentID)->vendorId($vendorID)->issueDate($issueDate)->get();
		$employee = Employee::find($invoices->first()->agentid);
		$campaign = Vendor::find($invoices->first()->vendor);

		$invoices = $invoices->transform(function ($v, $k) {
			$date = new DateTime($v->sale_date);
			$v->sale_date = $date->format('m-d-Y');
			return $v;
		});

		$invoiceDate = new DateTime($invoices->first()->issue_date);
		$weekEnding = new DateTime($invoices->first()->wkending);
		$issueDate = $invoiceDate->format('m-d-Y');
		$weekEnding = $weekEnding->format('m-d-Y');

		$invoices = json_encode($invoices);
		$overrides = json_encode($overrides);
		$expenses = json_encode($expenses);

		return view(
			'invoices.edit',
			['data' => json_encode([
				'invoices' => $invoices,
				'employee' => $employee,
				'campaign' => $campaign,
				'overrides' => $overrides,
				'expenses' => $expenses,
				'issueDate' => $issueDate,
				'weekending' => $weekEnding
			])]
		);
	}


	function formatDateCollectionSeparators($date, $currentFormat, $desiredFormat): string
	{
		return Carbon::createFromFormat($currentFormat, $date)->format($desiredFormat);
	}


	function array_insert($array, $var, $position): array
	{
		$before = array_slice($array, 0, $position);
		$after = array_slice($array, $position);

		$return = array_merge($before, (array) $var);
		return array_merge($return, $after);
	}


	public function showPaystub(Request $request)
	{
		$inputParams = $request->all();
		$agentId = $inputParams['agent'];
		$vendorId = $inputParams['vendor'];
		$date = new Carbon($inputParams['date']);
		$gross = 0;
		$invoiceDt = $date->format('m-d-Y');
		$issueDate = $date->format('Y-m-d');
		$stubs = Invoice::agentId($agentId)->vendorId($vendorId)->issueDate($date->format('Y-m-d'))->get();
		$emp = Employee::find($agentId);
		$vendorName = Vendor::find($vendorId)->name;

		/**
		 * At this point, the user MUST have at least one paystub... if they don't, this means that someone deleted
		 * the one record they did have and it needs to be recreated for the pages to work properly.
		 */
		if (count($stubs) < 1 || is_null($stubs)) {
			$this->invoiceService->insertBlankStub($agentId, $vendorId, $date);
		}

		foreach ($stubs as $s) {
			if (is_numeric($s->amount)) {
				$gross = $gross + $s->amount;
			}

			$s->sale_date = strtotime($s->sale_date);
			$s->sale_date = date('m-d-Y', $s->sale_date);
		}

		$overrides = Override::agentId($agentId)->vendorId($vendorId)->issueDate($issueDate)->get();
		$expenses = Expense::agentId($agentId)->vendorId($vendorId)->issueDate($issueDate)->get();

		$ovrGross = $overrides->sum(function ($ovr) {
			global $ovrGross;
			return $ovrGross + floatval($ovr->total);
		});

		$expGross = $expenses->sum(function ($exp) {
			global $expGross;
			return $expGross + floatval($exp->amount);
		});

		$gross = array_sum([$gross, $ovrGross, $expGross]);

		$loggedUser = Employee::find(Auth::user()->id);
		$isAdmin = ($loggedUser->is_admin == 1);

		return view('pdf.paystub', [
			'stubs' => $stubs,
			'emp' => $emp,
			'gross' => $gross,
			'invoiceDt' => $invoiceDt,
			'vendor' => $vendorName,
			'overrides' => $overrides,
			'expenses' => $expenses,
			'ovrgross' => $ovrGross,
			'expgross' => $expGross,
			'vendorId' => $vendorId,
			'isAdmin' => $isAdmin
		]);
	}


	public function printablePaystub(Request $request)
	{
		define('_MPDF_TEMP_PATH', public_path('assets/pdfs/temp'));
		define('_MPDF_TTFONTDATAPATH', public_path('assets/pdfs/temp'));
		$inputParams = $request->all();

		$agentId = $inputParams['agent'];
		$date = Carbon::createFromFormat('m-d-Y', $inputParams['date']);
		$sqlDate = $date->format('Y-m-d');
		$gross = 0;
		$invoiceDt = $date->format('m-d-Y');

		$emp = Employee::find($agentId);
		$vendorId = $inputParams['vendor'];
		$vendorName = Vendor::find($vendorId)->name;

		$stubs = Invoice::agentId($agentId)->vendorId($vendorId)->issueDate($sqlDate)->get();

		foreach ($stubs as $s) {
			if (is_numeric($s->amount)) {
				$gross = $gross + $s->amount;
			}

			$s->sale_date = strtotime($s->sale_date);
			$s->sale_date = date('m-d-Y', $s->sale_date);
		}

		$overrides = Override::agentId($agentId)->vendorId($vendorId)->issueDate($sqlDate)->get();
		$expenses = Expense::agentId($agentId)->vendorId($vendorId)->issueDate($sqlDate)->get();

		$ovrGross = $overrides->sum(function ($ovr) {
			global $ovrGross;
			return $ovrGross + $ovr->total;
		});

		$expGross = $expenses->sum(function ($exp) {
			global $expGross;
			return $expGross + $exp->amount;
		});

		$gross = array_sum([$gross, $ovrGross, $expGross]);


		$path = strtolower($emp->name . '_' . $vendorName . '_' . $date->format('Ymd') . '.pdf');

		$pdf = PDF::loadView('pdf.template', [
			'stubs' => $stubs,
			'emp' => $emp,
			'gross' => $gross,
			'invoiceDt' => $invoiceDt,
			'vendor' => $vendorName,
			'overrides' => $overrides,
			'expenses' => $expenses,
			'ovrgross' => $ovrGross,
			'expgross' => $expGross,
			'vendorId' => $vendorId
		]);

		return $pdf->stream($path);
	}


	public function makePdf(Request $request)
	{
		$url = urldecode($request->url);

		if (ini_get('allow_url_fopen')) {
			$html = file_get_contents($url);
		} else {
			$ch = curl_init($url);
			curl_setopt($ch, CURLOPT_HEADER, 0);
			curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
			$html = curl_exec($ch);
			curl_close($ch);
		}

		$pdf = PDF::loadHTML($html);

		$path = strtolower(str_replace(' ', '', Auth::user()->employee->name)) . '_' . strtotime(Carbon::now());
		$stream = $pdf->output($path);

		return view('pdf.template', ['html' => $stream]);
	}


	public function deletePaystubPdf(Request $request)
	{
		if (!$request->ajax()) {
			return response()->json(false);
		} else {
			$pdf = $request->all()['pdf'];
			$sto = new Storage;
			$sto->delete('/public/pdfs/' . $pdf);
			return response()->json(true);
		}
	}


	#region HELPER FUNCTIONS

	private function unsetValue(array $array, $value)
	{
		foreach ($array as $elementKey => $element) {
			foreach ($element as $eKey => $eVal) {
				if ($eKey == 'name' && $eVal == $value) {
					unset($array[$elementKey]);
				}
			}
		}

		return $array;
	}

	private function findObjectById($id, $array)
	{
		foreach ($array as $a) {
			if ($id == $a->id) {
				return $a;
			}
		}
	}

	protected function findValueInObjectArrayByType($id, $array, $key)
	{
		foreach ($array as $a) {
			if ($id == $a[$key]) {
				return true;
			}
		}

		return false;
	}

	#endregion

}
