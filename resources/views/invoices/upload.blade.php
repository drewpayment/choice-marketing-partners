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
                                <h6 class="mt-0 mb-0 pb-1 pl-3">Vendor</h6>
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
                                <h6 class="mt-0 mb-0 pb-1 pl-3">Agent</h6>
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
                                       placeholder="Weekending Date">
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
		<button class="btn btn-primary btn-lg btn-block" id="saveInvoice"><i class="fa fa-save"></i> Save</button>
	</div>
</div>

@endsection

@section('scripts')
<script src="https://code.jquery.com/ui/1.12.1/jquery-ui.js"></script>

<script type="text/javascript">
var overrides = false,
	expenses = false;

$(function(){
    var saveBtn = $('#saveInvoice');
	$('#wkendDate').datepicker();

	$(document).on('click', '#addOverrides', function(){
	    var el = $(this),
			$ovr = $('#overrides');
	    if(el.find('i').hasClass('fa-plus')){
            el.find('i').removeClass('fa-plus').addClass('fa-minus');
            overrides = true;
		} else {
	        el.find('i').removeClass('fa-minus').addClass('fa-plus');
	        overrides = false;
		}

		if(expenses){
	        $ovr.fadeToggle({
				done: function(){
				    overHot.render();
				}
			});
		} else {
            saveBtn.fadeToggle({
                done: function(){
                    $ovr.fadeToggle({
                        done: function(){
                            saveBtn.fadeToggle();
                            overHot.render();
                        }
                    });
                }
            });
		}


	});

	$(document).on('click', '#addExpenses', function(){
        var el = $(this),
			$exp = $('#expenses');

        if(el.find('i').hasClass('fa-plus')){
            el.find('i').removeClass('fa-plus').addClass('fa-minus');
            expenses = true;
        } else {
            el.find('i').removeClass('fa-minus').addClass('fa-plus');
            expenses = false;
        }

        if(overrides){
            $exp.fadeToggle({
				done: function(){
				    expHot.render();
				}
			});
		} else {
            saveBtn.fadeToggle({
                done: function(){
                    $exp.fadeToggle({
                        done: function(){
                            saveBtn.fadeToggle();
                            expHot.render();
                        }
                    });
                }
            });
		}

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
		120, 140, 160, 270, 150, 100, 100
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
			className: 'htRight',
			type: 'numeric',
			format: '0.00'
        }
    ]
});

var expenseContainer = document.getElementById('expensesTable');
var expHot = new Handsontable(expenseContainer, {
    minRows: 3,
    maxRows: 10,
    rowHeaders: true,
    colHeaders: ['Type', 'Amount', 'Notes'],
    colWidths: ['140', '100', '240'],
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


var prepareDataArrays = function(data, hot){
    var result = [];
	$.each(data, function(i, o){
	    if(!hot.isEmptyRow(i)) result.push(o);
	});
	return result;
};


/*
* handles when the user clicks save!
*
 */
$(document).on('click', '#saveInvoice', function(){
    setCommonUserInfo();

    var indSalesArr = [],
		overridesArr = [],
		expensesArr = [];

	var individualRows = prepareDataArrays(paystubHot.getData(), paystubHot),
		overrideRows, expenseRows;

	if(overrides) overrideRows = prepareDataArrays(overHot.getData(), overHot);
	if(expenses) expenseRows = prepareDataArrays(expHot.getData(), expHot);

	$.each(individualRows, function(i, o){
		if(o !== null && o !== undefined){
		    indSalesArr.push(setNewSale(o));
		}
	});

	$.each(overrideRows, function(i, o){
	   	if(o !== null && o !== undefined){
	   	    overridesArr.push(setNewOverride(o));
		}
	});

	$.each(expenseRows, function(i, o){
	    if(o !== null && o !== undefined){
	        expensesArr.push(setNewExpense(o));
		}
	});

    var input = {
        individual: indSalesArr,
        hasOverrides: overrides,
        hasExpenses: expenses,
		overrides: overridesArr,
		expenses: expensesArr,
		vendorId: $('#vendor').val(),
		employeeId: $('#employee').val(),
		date: moment($('#issueDate').val(), 'MM-DD-YYYY').format('YYYY-MM-DD'),
		endDate: moment($('#wkendDate').val(), 'MM-DD-YYYY').format('YYYY-MM-DD')
    };

    var options = {
        url: '/upload/save-invoice',
		type: 'POST',
		dataType: 'JSON',
		data: input,
		afterData: afterData
	};

    /*
    * check to make sure that the end user has submitted either: sales, overrides or expenses AND
    * filled out the required form fields to ensure that the invoice can be saved
    */
    if(input.individual.length || input.hasOverrides || input.hasExpenses &&
		input.vendorId > -1 &&
		input.employeeId > 0 &&
		input.date.length &&
		input.endDate.length) {

        console.dir([input.hasOverrides, input.hasExpenses]);
        fireAjaxRequest(options);
	} else {
        var errorMsg = 'Sorry, you need to fill out the form before you can submit the invoice.';
        setMessageContainer(errorMsg, null, 'danger');
	}


	function afterData(data){
	    if(data.status){
	        setMessageContainer(data.message);
	        resetHOT();
		} else {
	        setMessageContainer(data.message, null, 'danger');
		}
	}

});

</script>

@endsection