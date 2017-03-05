
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

        if(data) setMessageContainer("Success!", resetHOT);

    });

}


function resetHOT(){
    paystubHot.updateSettings({
        data: []
    });
    overHot.updateSettings({
        data: []
    });
    expHot.updateSettings({
        data: []
    });
}


// function verifyOverrides(){
//
// 	$.ajax({
// 		url: '/upload/overrides-modal',
// 		type: 'GET',
// 		dataType: 'html'
// 	}).done(function(data){
// 		MODAL_ELEM.html(data);
//
// 		wireButtonEvents(true, '#modal_layout');
// 	});
//
// }


function setCommonUserInfo(){
    token = $('meta[name="csrf-token"]').attr('content');
    currentAgentId = $('#employee').val();
    currentIssueDt = new Date($('#issueDate').val());
    currentWkEnding = $('#wkendDate').val();
    vendor = $('#vendor').val();
}


// function cancelOverrides(event){
//
// 	// need to handle where user gets sent after clicking no
//
// 	MODAL_ELEM.modal('hide');
// }


// MODAL_ELEM.off().on('shown.bs.modal', function(){
// 	// hide/show modal to handle refreshing content
// 	MODAL_ELEM.modal('hide').modal('show');
// });



// Register events

// $(document).on('show.bs.modal', MODAL_ELEM, function(e){ verifyOverrides(e); });
// $(document).on('click', '#noOvrBtn', function(e) { cancelOverrides(e); }); // no overrides, cancel and return
// $(document).on('click', '#yesOvrBtn', function(e) { handleOverridesInput(); }); // include overrides, advance to overrides input view


