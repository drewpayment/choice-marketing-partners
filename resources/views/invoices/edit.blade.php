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

@include('invoices._editinvoice', ['invoices' => $invoices, 'employee' => $employee, 'campaign' => $campaign])

@endsection

@section('scripts')
<script src="https://code.jquery.com/ui/1.12.1/jquery-ui.js"></script>

<script type="text/javascript">

$(document).on('click', 'button', handleClick);
var invoices = JSON.parse($('#invoiceTable').text());
var overrides = JSON.parse($('#overridesTable').text());
var expenses = JSON.parse($('#expensesTable').text());

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
	data: invoices,
	dataSchema: {
		id: null, 
		saleDate: null,
		first_name: null,
        last_name: null,
		address: null,
		city: null,
		status: null,
		amount: null
	},
	columns: [
		{data: 'id'},
		{data: 'sale_date', type: 'date', dateFormat: 'MM-DD-YYYY', correctFormat: true},
		{data: 'first_name'},
		{data: 'last_name'},
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
    data: overrides,
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
    data: expenses,
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
});

$('#deleteInvoiceBtn').confirmation({
    rootSelector: '#deleteInvoiceBtn',
    singleton: true,
    popout: true,
    onConfirm: function(){
        deleteInvoiceFromEditView();
    },
    onCancel: $(this).confirmation('hide')
});

</script>

@endsection