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
	public function index(): View {
		$result = $this->getInvoiceSearchParams();

		return view('invoices.upload', [
			'emps' => $result['agents'],
			'weds' => $result['issueDates'],
			'vendors' => $result['vendors']]);
	}

	/**
	 * Gets params to search for paystubs, serializes and returns them to Angular.
	 *
	 * @return JsonResponse
	 */
	public function getInvoicePageResources(): JsonResponse {
		$res = $this->getInvoiceSearchParams();
		return response()->json($res);
	}

	/**
	 * Gets the infomation necessary to search for paystubs.
	 *
	 * @return array
	 */
	private function getInvoiceSearchParams(): array {
		$emps = Employee::active()->hideFromPayroll()->orderByName()->get();
		$vendors = Vendor::active()->get();
		$wedArr = [];

		for($i = 0; $i < 6; $i++){
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
		if(!request()->ajax())
			return response()->json(false);

		$input = json_decode($request->all()['input'], true);
		$result = $this->invoiceService->saveInvoice($input);

		return response()->json($result);
    }

	/**
	 * Replaces UploadInvoice()
	 *
	 * @param Request $request
	 *
	 * @return JsonResponse
	 */
    public function saveApiInvoice(Request $request): JsonResponse
    {
        $vendor_id = $request['vendorId'];
        $agent_id = $request['agentId'];
        $issue_date = $request['issueDate'];
        $week_ending = $request['weekending'];
        
        $pending_deletes = $request['pendingDeletes'];
        
        if (isset($pending_deletes))
        {
            $this->deletePendingInvoiceItems($pending_deletes);
        }
        
        $salesTotal = array_reduce($request['sales'], function ($a, $b) {
            $a['amount'] = $a['amount'] + $b['amount'];
            return $a;
        })['amount'];
        
        $overridesTotal = array_reduce($request['overrides'], function ($a, $b) {
            $a['total'] = $a['total'] + $b['total'];
            return $a;
        })['total'];
        
        $expensesTotal = array_reduce($request['expenses'], function ($a, $b) {
            $a['amount'] = $a['amount'] + $b['amount'];
            return $a;
        })['amount'];
        
        $totals = [
            'sales' => $salesTotal,
            'overrides' => $overridesTotal,
            'expenses' => $expensesTotal
        ];
        
        $pending = $this->mapToPendingInvoice($request, $vendor_id, $agent_id, $issue_date, $week_ending, $totals);
        
        $result = $this->updateOrInsertInvoices($pending);
        
        // Update/Create new payroll record which gets used on the /payroll screen to show a list of payroll information
        // NOT to be confused with the insanely duplicated entity called "Paystub" that creates a very similar screen... WTF
        $pending_payroll = $pending['payroll'];
        $payroll = Payroll::find($pending_payroll['id']);
        
        if ($payroll != null) 
        {
            $payroll->agent_name = $pending_payroll['agent_name'];
            $payroll->amount = $pending_payroll['amount'];
            $payroll->is_paid = $pending_payroll['is_paid'];
            $payroll->vendor_id = $pending_payroll['vendor_id'];
            $payroll->pay_date = $pending_payroll['pay_date'];
            $payroll->save();
        }
        else 
        {
            Payroll::insert($pending_payroll);
        }
        
        $this->paystubService->processPaystubJob($issue_date);
        
        return response()->json($pending);
    }
    
    private function deletePendingInvoiceItems($pending_deletes)
    {
        if (isset($pending_deletes['sales']) && count($pending_deletes['sales']) > 0) 
        {
            Invoice::destroy($pending_deletes['sales']);
        }
        
        if (isset($pending_deletes['overrides']) && count($pending_deletes['overrides']) > 0) 
        {
            Override::destroy($pending_deletes['overrides']);
        }
        
        if (isset($pending_deletes['expenses']) && count($pending_deletes['expenses']) > 0)
        {
            Expense::destroy($pending_deletes['expenses']);
        }
    }
    
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
        foreach ($pending['sales'] as $sale)
        {
            $s = Invoice::find($sale['invoice_id']);
            
            if ($s != null)
            {
                $s->first_name = $sale['first_name'];
                $s->last_name = $sale['last_name'];
                $s->address = $sale['address'];
                $s->city = $sale['city'];
                $s->status = $sale['status'];
                $s->amount = $sale['amount'];
                $s->save();
            }
            else 
            {
                $sale_model = Invoice::create($sale);
            }
        }
        
        foreach ($pending['overrides'] as $override)
        {
            $o = Override::find($override['ovrid']);
            
            if ($o != null)
            {
                $o->name = $override['name'];
                $o->sales = $override['sales'];
                $o->commission = $override['commission'];
                $o->total = $override['total'];
                $o->save();
            }
            else 
            {
                $o = Override::create($override);
            }
        }
        
        foreach ($pending['expenses'] as $expense)
        {
            $e = Expense::find($expense['expid']);
            
            if ($e != null)
            {
                $e->type = $expense['type'];
                $e->amount = $expense['amount'];
                $e->notes = $expense['notes'];
                $e->save();
            }
            else 
            {
                $e = Expense::create($expense);
            }
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
                'amount' => $sale['amount'],
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
                'total' => $ovr['total'],
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
                'amount' => $exp['amount'],
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
        if ($payroll != null)
        {
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
		try{
			Invoice::agentId($id)->vendorId($vendor)->issueDate($date)->delete();
			Expense::agentId($id)->vendorId($vendor)->issueDate($date)->delete();
			Override::agentId($id)->vendorId($vendor)->issueDate($date)->delete();
			Paystub::agentId($id)->vendorId($vendor)->issueDate($date)->delete();

			DB::commit();
			$result = true;
		}
		catch (Exception $e)
		{
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
		if($vendorID < 1)
			back()->withError('Missing campaign information. Please refresh the page and try again.')
				->withInput();

		$invoices = Invoice::agentId($agentID)->vendorId($vendorID)->issueDate($issueDate)->get();
		$overrides = Override::agentId($agentID)->vendorId($vendorID)->issueDate($issueDate)->get();
		$expenses = Expense::agentId($agentID)->vendorId($vendorID)->issueDate($issueDate)->get();
		$employee = Employee::find($invoices->first()->agentid);
		$campaign = Vendor::find($invoices->first()->vendor);

		$invoices = $invoices->transform(function($v, $k){
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

		return view('invoices.edit',
			['data' => json_encode(['invoices' => $invoices,
			'employee' => $employee,
			'campaign' => $campaign,
			'overrides' => $overrides,
			'expenses' => $expenses,
			'issueDate' => $issueDate,
			'weekending' => $weekEnding])]);
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
        if (count($stubs) < 1 || is_null($stubs))
        {
            $this->invoiceService->insertBlankStub($agentId, $vendorId, $date);
        }

		foreach($stubs as $s)
		{
			if(is_numeric($s->amount))
			{
				$gross = $gross + $s->amount;
			}

			$s->sale_date = strtotime($s->sale_date);
			$s->sale_date = date('m-d-Y', $s->sale_date);
        }

		$overrides = Override::agentId($agentId)->vendorId($vendorId)->issueDate($issueDate)->get();
        $expenses = Expense::agentId($agentId)->vendorId($vendorId)->issueDate($issueDate)->get();

		$ovrGross = $overrides->sum(function($ovr){
			global $ovrGross;
			return $ovrGross + floatval($ovr->total);
		});

		$expGross = $expenses->sum(function($exp){
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

		foreach($stubs as $s)
		{
			if(is_numeric($s->amount))
			{
				$gross = $gross + $s->amount;
			}

			$s->sale_date = strtotime($s->sale_date);
			$s->sale_date = date('m-d-Y', $s->sale_date);
		}

		$overrides = Override::agentId($agentId)->vendorId($vendorId)->issueDate($sqlDate)->get();
		$expenses = Expense::agentId($agentId)->vendorId($vendorId)->issueDate($sqlDate)->get();

		$ovrGross = $overrides->sum(function($ovr){
			global $ovrGross;
			return $ovrGross + $ovr->total;
		});

		$expGross = $expenses->sum(function($exp){
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

		if(ini_get('allow_url_fopen'))
		{
			$html = file_get_contents($url);
		}
		else
		{
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
		if(!$request->ajax()){
            return response()->json(false);
		}
		else
		{
			$pdf = $request->all()['pdf'];
			$sto = new Storage;
			$sto->delete('/public/pdfs/' . $pdf);
			return response()->json(true);
		}
	}


	#region HELPER FUNCTIONS

	private function unsetValue(array $array, $value)
	{
		foreach($array as $elementKey => $element){
			foreach($element as $eKey => $eVal){
				if($eKey == 'name' && $eVal == $value){
					unset($array[$elementKey]);
				}
			}
		}

		return $array;
	}

	private function findObjectById($id, $array)
	{
		foreach($array as $a)
		{
			if($id == $a->id)
			{
				return $a;
			}
		}
	}

	protected function findValueInObjectArrayByType($id, $array, $key)
	{
		foreach($array as $a)
		{
			if($id == $a[$key])
			{
				return true;
			}
		}

		return false;
	}

	#endregion

}
