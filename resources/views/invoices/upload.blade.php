@extends('layouts.app')

@section('topCSS')
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/handsontable/0.29.2/handsontable.css">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/handsontable/0.29.2/handsontable.full.css">
<link rel="stylesheet" href="//code.jquery.com/ui/1.12.1/themes/base/jquery-ui.css">
@endsection

@section('topJS')
<script src="https://cdnjs.cloudflare.com/ajax/libs/handsontable/0.29.2/handsontable.full.js"></script>
@endsection

@section('content')

<div class="row pt-10">
	<div class="col-xs-8">
		<h2>Upload a New Invoice <small>one upload per employee</small></h2>
	</div>
</div>

<div class="row pt-20">
	<div class="col-xs-12">
		<ul class="list-inline">
			<li>
				<span><h4>Agent: </h4></span>
			</li>
			<li>
				<select class="selectpicker" id="employee" data-mobile="true">
					<?php $i = 0; ?>
					@foreach($emps as $emp)
						<option value="{{$emp->id}}" @if($i == 0) selected @endif>{{$emp->name}}</option>
						<?php $i++; ?>
					@endforeach
				</select>
			</li>
			<li>
				<span><h4>Issue Date: </h4></span>
			</li>
			<li>
				<select class="selectpicker" id="issueDate" data-mobile="true">
					<?php $n = 0; ?>
					<option value="-1" selected>Pick One</option>
					@foreach($weds as $wed)
						<option value="{{$wed}}">{{$wed}}</option>
						<?php $n++; ?>
					@endforeach
				</select>
			</li>
			<li>
				<span><h4>Weekending Date: </h4></span>
			</li>
			<li>
				<input type="text" class="form-control datepicker-hot" id="wkendDate"></input>
			</li>
			<br>
			<li>
				<span><h4>Vendor: </h4></span>
			</li>
			<li>
				<select class="selectpicker" id="vendor" data-mobile="true">
					<option value="-1" selected>Select Vendor</option>
					@foreach($vendors as $v)
						<option value="{{$v->id}}">{{$v->name}}</option>
					@endforeach
				</select>
			</li>
		</ul>
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
			<li>
				<h2>Overrides <small>Enter any applicable overrides.</small></h2>
				<br>
				<div id="overridesTable" class="overridesTable" data-parent="true"></div>
			</li>
			<li>
				<h2>Expenses <small>Enter any applicable expenses.</small></h2>
				<br>
				<div id="expensesTable" class="overridesTable" data-parent="true"></div>
			</li>
		</ul>
		<div class="pull-right pr-60">
			<ul class="list-inline">
				<li>
					<button class="btn btn-primary" data-tag="1">Submit</button>
				</li>
				<li>
					<button class="btn btn-default">Cancel</button>
				</li>
			</ul>
		</div>
	</div>
</div>

@endsection

@section('scripts')
<script src="https://code.jquery.com/ui/1.12.1/jquery-ui.js"></script>

<script type="text/javascript">
$(function(){
	$('#wkendDate').datepicker();
	wireButtonEvents(true, null);
});


var paystubContainer = document.getElementById('invoiceTable');
var paystubHot = new Handsontable(paystubContainer, {
	minRows: 10,
	minCols: 6,
	rowHeaders: true,
	colHeaders: [
		'ID', 'Sale Date', 'First Name', 'Last Name', 'Address', 'City', 'Sale Status', 'Amount'
	],
	colWidths: [
		40, 120, 140, 160, 220, 150, 100, 100
	],
	contextMenu: true,
	allowInsertColumn: false,
	allowRemoveColumn: false,
	minSpareRows: 1,
	data: [],
	dataSchema: {
		id: null, 
		saleDate: null,
		custName: { first: null, last: null },
		address: null,
		city: null,
		status: null,
		amount: null
	},
	columns: [
		{data: 'id'},
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
    colHeaders: ['ID', 'Name', '# of Sales', 'Commission', 'Total'],
    colWidths: ['40', '140', '100', '120', '100'],
    contextMenu: true,
    allowInsertColumn: false,
    allowRemoveColumn: false,
    minSpareRows: 1,
    data: [],
    dataSchema: {
        id: null,
        name: null,
        sales: null,
        commission: null,
        total: null
    },
    columns: [
        {data: 'id', editor: false},
        {data: 'name'},
        {data: 'sales'},
        {data: 'commission'},
        {data: 'total'}
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
        {data: 'amount'},
        {data: 'notes'}
    ]
})



</script>

@endsection