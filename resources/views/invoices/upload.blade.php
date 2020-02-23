@extends('layouts.app')

@section('topCSS')
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/handsontable/0.29.2/handsontable.css">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/handsontable/0.29.2/handsontable.full.css">
<link rel="stylesheet" href="//code.jquery.com/ui/1.12.1/themes/base/jquery-ui.css">
@endsection

@section('topJS')
<script src="https://cdnjs.cloudflare.com/ajax/libs/handsontable/0.29.2/handsontable.full.js"></script>
@endsection

@section('title', 'Create an Invoice')

@section('content')

<!-- <cp-create-invoice></cp-create-invoice> -->

<div class="row pt-10">
	<div class="col-xs-12">
		<div class="box box-default">
			<div class="box-title bg-primary">
				<h2 class="mt-0 mb-0">New Invoice
					<span class="pull-right">
						<button class="btn btn-default" id="addOverrides"><i class="fa fa-plus"></i> Overrides</button>
						<button class="btn btn-default" id="addExpenses"><i class="fa fa-plus"></i> Expenses</button>
					</span>
				</h2>
			</div>
			<div class="box-content">
                <ul class="list-inline">
                    <li>
                        <div class="box box-default b-0 mb-0">
                            <div class="box-content pt-5">
                                <h6 class="mt-0 mb-0 pb-1 pl-3">Vendor <small>[<a href="{{url('/vendors')}}">Manage</a>]</small></h6>
                                <select class="selectpicker" id="vendor">
                                    <option value="-1" selected>Select Vendor</option>
                                    @foreach($vendors as $v)
                                        <option value="{{$v->id}}">{{$v->name}}</option>
                                    @endforeach
                                </select>
                            </div>
                        </div>
                    </li>
                    <li>
                        <div class="box box-default b-0 mb-0">
                            <div class="box-content pt-5">
                                <h6 class="mt-0 mb-0 pb-1 pl-3">Agent <small>[<a href="{{url('/agents')}}">Manage</a>]</small></h6>
                                <select class="selectpicker" id="employee" data-live-search="true" data-size="8">
                                    <option value="-1" selected>Select Agent</option>
		                            <?php $i = 0; ?>
                                    @foreach($emps as $emp)
                                        <option value="{{$emp->id}}">{{$emp->name}}</option>
			                            <?php $i++; ?>
                                    @endforeach
                                </select>
                            </div>
                        </div>
                    </li>
                    <li>
                        <div class="box box-default b-0 mb-0">
                            <div class="box-content pt-5">
                                <h6 class="mt-0 mb-0 pb-1 pl-3">Issue Date</h6>
                                <select class="selectpicker" id="issueDate">
		                            <?php $n = 0; ?>
                                    <option value="-1" selected>Issue Date</option>
                                    @foreach($weds as $wed)
                                        <option value="{{$wed}}">{{$wed}}</option>
			                            <?php $n++; ?>
                                    @endforeach
                                </select>
                            </div>
                        </div>
                    </li>
                    <li>
                        <div class="box box-default b-0 mb-0">
                            <div class="box-content pt-5">
                                <h6 class="mt-0 mb-0 pb-1 pl-3">Week Ending</h6>
                                <input class="form-control datepicker-hot w-220" id="wkendDate"
                                       placeholder="Weekending Date" autocomplete="off" />
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
				<div id="invoiceTable"></div>
			</div>
		</div>
	</div>
</div>
<div class="row pt-10">
	<div class="col-xs-6">
		<div class="box box-default" id="overrides" style="display:none;">
			<div class="box-title bg-primary">
				<h2 class="mt-0 mb-0">Overrides</h2>
			</div>
			<div class="box-content">
				<div id="overridesTable" class="overridesTable" data-parent="true"></div>
			</div>
		</div>
	</div>
	<div class="col-xs-6">
		<div class="box box-default" id="expenses" style="display:none;">
			<div class="box-title bg-primary">
				<h2 class="mt-0 mb-0">Expenses</h2>
			</div>
			<div class="box-content">
				<div id="expensesTable" class="overridesTable" data-parent="true"></div>
			</div>
		</div>
	</div>
</div>
<div class="row pt-20">
	<div class="col-xs-10 col-xs-offset-1">
		<button class="btn btn-primary btn-lg btn-block" style="margin-bottom: 1rem !important;" id="saveInvoice"><i class="fa fa-save"></i> Save</button>
	</div>
</div>

@endsection

@section('scripts')
<script src="https://code.jquery.com/ui/1.12.1/jquery-ui.js"></script>

<script src="{{elixir('js/views/invoices/upload.js')}}"></script>

@endsection