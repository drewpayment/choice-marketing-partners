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

<div class="row pt-10">
	<div class="col-xs-8">
		<h2>New Invoice</h2>
	</div>
	<div class="col-xs-4 pull-right">
		<button class="btn btn-default" id="addOverrides"><i class="fa fa-plus"></i> Overrides</button>
		<button class="btn btn-default" id="addExpenses"><i class="fa fa-plus"></i> Expenses</button>
	</div>
</div>

<div class="row pt-20 pb-10">
	<div class="col-xs-12">
		<div class="form-inline">
			<div class="form-group">
				<label for="vendor"></label>
				<select class="selectpicker" id="vendor" data-mobile="true">
					<option value="-1" selected>Select Vendor</option>
					@foreach($vendors as $v)
						<option value="{{$v->id}}">{{$v->name}}</option>
					@endforeach
				</select>
			</div>
			<div class="form-group">
				<label for="employee">Agent: </label>
				<select class="selectpicker" id="employee" data-live-search="true">
					<?php $i = 0; ?>
					@foreach($emps as $emp)
						<option value="{{$emp->id}}" @if($i == 0) selected @endif>{{$emp->name}}</option>
						<?php $i++; ?>
					@endforeach
				</select>
			</div>
			<div class="form-group">
				<label for="issueDate">Issued: </label>
				<select class="selectpicker" id="issueDate" data-mobile="true">
					<?php $n = 0; ?>
					<option value="-1" selected>Pick One</option>
					@foreach($weds as $wed)
						<option value="{{$wed}}">{{$wed}}</option>
						<?php $n++; ?>
					@endforeach
				</select>
			</div>
			<div class="form-group">
				<label for="wkendDate">Wkending: </label>
				<input type="text" class="form-control datepicker-hot" id="wkendDate">
			</div>
		</div>
	</div>
</div>

<div class="row">
	<div class="col-xs-12">
		<meta name="csrf-token" content="{{ csrf_token() }}" />
		<div id="invoiceTable"></div>
	</div>
</div>
<div class="row pt-10">
	<div class="col-xs-12">
		<ul class="list-inline">
			<li class="hidden" id="overrides">
				<h3>Overrides</h3>
				<div id="overridesTable" class="overridesTable" data-parent="true"></div>
			</li>
			<li class="hidden" id="expenses">
				<h3>Expenses</h3>
				<div id="expensesTable" class="overridesTable" data-parent="true"></div>
			</li>
		</ul>
	</div>
</div>
<div class="row pt-20">
	<div class="col-xs-11">
		<div class="pull-right">
			<button class="btn btn-primary" data-tag="1" data-vero="button"><i class="fa fa-save"></i> Save</button>
		</div>
	</div>
</div>

@endsection

@section('scripts')
<script src="https://code.jquery.com/ui/1.12.1/jquery-ui.js"></script>

<script type="text/javascript">
$(function(){
	$('#wkendDate').datepicker();

	$(document).on('click', '#addOverrides', function(){
	    var el = $(this);
	    if(el.find('i').hasClass('fa-plus')){
            el.find('i').removeClass('fa-plus').addClass('fa-minus');
		} else {
	        el.find('i').removeClass('fa-minus').addClass('fa-plus');
		}
	   	$('#overrides').toggleClass('hidden');
	});

	$(document).on('click', '#addExpenses', function(){
        var el = $(this);
        if(el.find('i').hasClass('fa-plus')){
            el.find('i').removeClass('fa-plus').addClass('fa-minus');
        } else {
            el.find('i').removeClass('fa-minus').addClass('fa-plus');
        }
	   	$('#expenses').toggleClass('hidden');
	});
});

$(document).on('click', 'button', handleClick);


var paystubContainer = document.getElementById('invoiceTable');
var paystubHot = new Handsontable(paystubContainer, {
	minRows: 10,
	minCols: 6,
	rowHeaders: true,
	colHeaders: [
		'Sale Date', 'First Name', 'Last Name', 'Address', 'City', 'Sale Status', 'Amount'
	],
	colWidths: [
		120, 140, 160, 220, 150, 100, 100
	],
	contextMenu: true,
	allowInsertColumn: false,
	allowRemoveColumn: false,
	minSpareRows: 1,
	data: [],
	dataSchema: {
		saleDate: null,
		custName: { first: null, last: null },
		address: null,
		city: null,
		status: null,
		amount: null
	},
	columns: [
		{data: 'saleDate', type: 'date', dateFormat: 'MM/DD/YYYY'},
		{data: 'custName.first'},
		{data: 'custName.last'},
		{data: 'address'},
		{data: 'city'},
		{data: 'status'},
		{data: 'amount'}
	]
});

var overrideContainer = document.getElementById('overridesTable');
var overHot = new Handsontable(overrideContainer, {
    minRows: 3,
    maxRows: 15,
    rowHeaders: true,
    colHeaders: ['Name', '# of Sales', 'Commission', 'Total'],
    colWidths: ['140', '100', '120', '100'],
    contextMenu: true,
    allowInsertColumn: false,
    allowRemoveColumn: false,
    minSpareRows: 1,
    data: [],
    dataSchema: {
        name: null,
        sales: null,
        commission: null,
        total: null
    },
    columns: [
        {data: 'name'},
        {
            data: 'sales',
			className: 'htRight'
		},
        {
            data: 'commission',
			className: 'htRight',
			type: 'numeric',
			format: '0.00'
		},
        {
            data: 'total',
			renderer: function(hot, td, row, col, prop, value, cellProperties){
                var sales = hot.getDataAtCell(row, 1);
                var comm = hot.getDataAtCell(row, 2);

                if(sales !== undefined && comm !== undefined && sales > 0 && comm > 0){
                    var result = sales * comm;
                    td.innerHTML = '<span class="pull-right">$'+ result.toFixed(2) +'</span>';
				} else {
                    td.innerHTML = '<span class="pull-right"></span>';
				}
			}
        }
    ]
});

var expenseContainer = document.getElementById('expensesTable');
var expHot = new Handsontable(expenseContainer, {
    minRows: 3,
    maxRows: 10,
    rowHeaders: true,
    colHeaders: ['Type', 'Amount', 'Notes'],
    colWidths: ['140', '100', '275'],
    contextMenu: true,
    allowInsertColumn: false,
    allowRemoveColumn: false,
    minSpareRows: 1,
    data: [],
    dataSchema: {
        type: null,
        amount: null,
        notes: null
    },
    columns: [
        {data: 'type'},
        {
            data: 'amount',
			className: 'htRight',
			type: 'numeric',
			format: '0.00'
		},
        {data: 'notes'}
    ]
});

</script>

@endsection