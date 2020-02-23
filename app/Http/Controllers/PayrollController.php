<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class PayrollController extends Controller
{
    public function payrollDispute() 
    {
        return view('emails.dispute');
    }

    public function confirmDeletePaystub() 
    {
        return view('invoices.deletemodal');
    }
}
