
/*
$('#editEmployeeBtn').on('click', function(){
	var $clickedBtn = $(this);
	var token = $('[data-token="true"]').data('value');
	var $modal = $('#modal_layout');

	$modal.on('show.bs.modal', function(){
		$.ajax({
			url: './editemployee/',
			type: 'POST',
			dataType: "html", 
			data: {
				id: $clickedBtn.data('value'),
				_token: token
			}
		}).done(function(data){
			var result = data;
			$modal.html(result);

		}).fail(function(event){
			var result = event.responseText;
			$modal.html(result);
		});
	})

	$modal.modal('show');
});
*/

$(function(){
	var $modal = $('#modal_layout');
	$modal.on('hidden.bs.modal', function(){
		$modal.removeData();
		$modal.html('');
	});
});

function editEmployee(e){
	var $clickedBtn = $($(e)[0]);
	var token = $('[data-token="true"]').data('value');
	var $modal = $('#modal_layout');

	$modal.on('show.bs.modal', function(){
		$.ajax({
			url: './editemployee/',
			type: 'POST',
			dataType: "html", 
			data: {
				id: $clickedBtn.data('value'),
				_token: token
			}
		}).done(function(data){
			$modal.html(data);

		}).fail(function(event){
			var result = event.responseText;
			$modal.html(result);
		});
	});

	$modal.modal('show');
}

// Vars

var MODAL_ELEM = $('#modal_layout'),
	salesList = [],
	overList = [],
	currentAgentId,
	currentIssueDt,
	currentWkEnding,
	overHot,
    expHot,
	token,
    expensesList = [],
    vendor;

var setNewSale = function (s){
    return {
        id: s[0],
        date: s[1],
        name: {
            first: s[2],
            last: s[3]
        },
        address: s[4],
        city: s[5],
        status: s[6],
        amount: s[7],
        agentid: null,
        issueDate: null,
        wkending: null,
        vendor: null
    };
};


var setNewOverride = function (o){
    return {
        id: o[0],
        name: o[1],
        numOfSales: o[2],
        commission: o[3],
        total: o[4],
        agentid: currentAgentId,
        issueDate: currentIssueDt,
        wkending: currentWkEnding
    };
};


var setNewExpense = function (e){
    return {
        type: e[0],
        amount: e[1],
        notes: e[2],
        agentid: currentAgentId,
        issueDate: currentIssueDt,
        wkending: currentWkEnding
    }
};



// Functions


function handleSubmitNewInvoice(data){
    setCommonUserInfo();

    var invoiceData = paystubHot.getData();
    var overrideData = overHot.getData();
    var expenseData = expHot.getData();

    var invoices = cleanArray(invoiceData, paystubHot);
    var overrides = cleanArray(overrideData, overHot);
    var expenses = cleanArray(expenseData, expHot);

    $.each(invoices, function(i, obj){
        if(obj !== null && obj !== undefined){
            var s = setNewSale(obj);
            s.id = i;
            s.agentid = currentAgentId;
            s.issueDate = currentIssueDt;
            s.wkending = currentWkEnding;
            s.vendor = vendor;
            salesList.push(s);
        }
    });

    $.each(overrides, function(i, obj){
        if(obj !== null && obj !== undefined) {
            var o = setNewOverride(obj);
            o.id = i;
            o.agentid = currentAgentId;
            o.issueDate = currentIssueDt;
            o.wkending = currentWkEnding;
            overList.push(o);
        }
    });

    $.each(expenses, function(i, obj){
        if(obj !== null && obj !== undefined){
            var e = setNewExpense(obj);
            expensesList.push(e);
        }
    });

    $.ajax({
        url: '/upload/invoice',
        type: 'POST',
        data: {
            _token: token,
            sales: salesList,
            overrides: overList,
            expenses: expensesList
        },
        dataType:'JSON'
    }).done(function(data){

        if(data) setUserMessage("Success!");

    });

}


function setUserMessage(message){

    $('#js_msgs').removeClass('hidden').html(message).fadeOut(2500, function(){
        paystubHot.updateSettings({
            data: []
        });
        overHot.updateSettings({
            data: []
        });
        expHot.updateSettings({
            data: []
        });
    });

}


function verifyOverrides(){

	$.ajax({
		url: '/upload/overrides-modal',
		type: 'GET',
		dataType: 'html'
	}).done(function(data){
		MODAL_ELEM.html(data);

		wireButtonEvents(true, '#modal_layout');
	});

}


function setCommonUserInfo(){
    token = $('meta[name="csrf-token"]').attr('content');
    currentAgentId = $('#employee').val();
    currentIssueDt = new Date($('#issueDate').val());
    currentWkEnding = $('#wkendDate').val();
    vendor = $('#vendor').val();
}


function cancelOverrides(event){

	// need to handle where user gets sent after clicking no

	MODAL_ELEM.modal('hide');
}


MODAL_ELEM.off().on('shown.bs.modal', function(){
	// hide/show modal to handle refreshing content
	MODAL_ELEM.modal('hide').modal('show');
});



// Register events

$(document).on('show.bs.modal', MODAL_ELEM, function(e){ verifyOverrides(e); });
$(document).on('click', '#noOvrBtn', function(e) { cancelOverrides(e); }); // no overrides, cancel and return
$(document).on('click', '#yesOvrBtn', function(e) { handleOverridesInput(); }); // include overrides, advance to overrides input view



var tag = {

	SUBMIT_INVOICE_BTN: 1

};

// after event controls


function processDataTag(data){

	if (data.tag === tag.SUBMIT_INVOICE_BTN) handleSubmitNewInvoice(data);

}


function afterEventControl(evt){

	if(evt.target !== evt.currentTarget){
		var elem = $(evt.target),
			dataList = elem.data(),
			data = {};

		data.e = evt.target;
		data.tag = dataList["tag"];

		if(dataList["parentid"] == undefined) {
			var parent = (elem.closest('[data-parent="true"]').length > 0) ? elem.closest('[data-parent="true"]') : $('[data-parent="true"]');
			data.parent = parent;
			data.parentid = ($(parent).data('parentid') === undefined) ? null : $(parent).data('parentid');
		} else {
		    data.parentid = dataList["parentid"];
		    data.parent = $('[data-parentid="'+data.parentid+'"]').get();
        }


		processDataTag(data);
	}

	evt.stopPropagation();
}


// wire up events

function wireButtonEvents(wireEvent, container){

    // parent containers available on page load
    if(container === undefined || container === null) {
        container = document.querySelector('body');


    } else {
        container = document.querySelector(container);
    }



    if(wireEvent){
        // wire up initialized container
        if(container !== undefined && container !== null) {
            container.addEventListener("click", afterEventControl, false);




            container = null;
        }
    }

}


// JS helper functions

function cleanArray(data, hot) {
    var temp = {};

    $.each(data, function(idx, obj){
       if(!hot.isEmptyRow(idx)) temp[idx] = obj;
    });

    return temp;

}


//# sourceMappingURL=all.js.map
