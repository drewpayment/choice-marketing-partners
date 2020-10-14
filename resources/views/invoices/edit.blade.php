@extends('layouts.app')

@section('title', 'Edit Invoice')

@section('content')

    <cp-create-invoice data="{{$data}}"></cp-create-invoice>

    <!-- <div class="row pt-10">
        <div class="col-xs-12">
            <div class="box box-default">
                <div class="box-title bg-primary">
                    <h2 class="mt-0 mb-0">Edit Invoice
                        <span class="pull-right">
						<button class="btn btn-default" id="addOverrides"><i class="fa"></i> Overrides</button>
						<button class="btn btn-default" id="addExpenses"><i class="fa"></i> Expenses</button>
					</span>
                    </h2>
                </div>
                <div class="box-content">
                    <ul class="list-inline">
                        <li>
                            <div class="box box-default b-0 mb-0 w-250">
                                <div class="box-title mb-0 pb-0 bg-primary">
                                    <h6 class="mt-0 pl-3">Vendor</h6>
                                </div>
                                <div class="box-content pt-0">
                                    <h3 data-vendorid="{{$campaign->id}}">{{$campaign->name}}</h3>
                                </div>
                            </div>
                        </li>
                        <li>
                            <div class="box box-default b-0 mb-0 w-250">
                                <div class="box-title mb-0 pb-0 bg-primary">
                                    <h6 class="mt-0 pl-3">Agent</h6>
                                </div>
                                <div class="box-content pt-0">
                                    <h3 data-agentid="{{$employee->id}}">{{$employee->name}}</h3>
                                </div>
                            </div>
                        </li>
                        <li>
                            <div class="box box-default b-0 mb-0 w-250">
                                <div class="box-title pb-0 mb-0 bg-primary">
                                    <h6 class="mt-0 pl-3">Issue Date</h6>
                                </div>
                                <div class="box-content pt-0">
                                    <h3 id="issue-date">{{$issueDate}}</h3>
                                </div>
                            </div>
                        </li>
                        <li>
                            <div class="box box-default b-0 mb-0 w-250">
                                <div class="box-title mb-0 pb-0 bg-primary">
                                    <h6 class="mt-0 pl-3">Week Ending</h6>
                                </div>
                                <div class="box-content pt-0">
                                    <h3 id="week-ending">{{$weekEnding}}</h3>
                                </div>
                            </div>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    </div>

    <div class="row">
        <div class="col-xs-12">
            <div class="box box-default">
                <div class="box-title bg-primary">
                    <h2 class="mt-0 mb-0">Sales</h2>
                </div>
                <div class="box-content">
                    <div id="invoiceTable"><div class="jsdata">{{$invoices}}</div></div>
                </div>
            </div>
        </div>
    </div>
    <div class="row pt-10">
        <div class="col-xs-6">
            <div class="box box-default" id="overrides">
                <div class="box-title bg-primary">
                    <h2 class="mt-0 mb-0">Overrides</h2>
                </div>
                <div class="box-content">
                    <div id="overridesTable" class="overridesTable" data-parent="true" data-length="{{strlen($overrides)}}"><div class="jsdata">{{$overrides}}</div></div>
                </div>
            </div>
        </div>
        <div class="col-xs-6">
            <div class="box box-default" id="expenses">
                <div class="box-title bg-primary">
                    <h2 class="mt-0 mb-0">Expenses</h2>
                </div>
                <div class="box-content">
                    <div id="expensesTable" class="overridesTable" data-parent="true" data-length="{{strlen($expenses)}}"><div class="jsdata">{{$expenses}}</div></div>
                </div>
            </div>
        </div>
    </div>
    <div class="row pt-20 mb-2">
        <div class="col-xs-10 col-xs-offset-1">
            <button class="btn btn-primary btn-lg btn-block" id="saveInvoice"><i class="fa fa-save"></i> Save</button>
        </div>
    </div> -->

@endsection
