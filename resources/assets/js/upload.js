
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
    var amt = sanitizeCurrency(s[7]);

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
        amount: amt,
        agentid: null,
        issueDate: null,
        wkending: null,
        vendor: null
    };
};


var setNewOverride = function (o){
    var amt = sanitizeCurrency(o[4]);

    return {
        id: o[0],
        name: o[1],
        numOfSales: o[2],
        commission: o[3],
        total: amt,
        agentid: currentAgentId,
        issueDate: currentIssueDt,
        wkending: currentWkEnding
    };
};


var setNewExpense = function (e){
    var issue = new Date(currentIssueDt);
    var amt = sanitizeCurrency(e[1]);

    return {
        type: e[0],
        amount: amt,
        notes: e[2],
        agentid: currentAgentId,
        issueDate: issue.toLocaleDateString(),
        wkending: currentWkEnding
    }
};

var inputParams = {
    vendorid: null,
    issue_date: null,
    agentid: null
};

var sanitizeCurrency = function(value){
    var val = String(value).replace(/[^0-9.\-]/, "");
    val = parseFloat(val);
    val = Math.round(val * 100) / 100;

    return val;
};



// Functions


function handleSubmitNewInvoice(data){
    setCommonUserInfo(false);

    var invoiceData = paystubHot.getData();
    var overrideData = overHot.getData();
    var expenseData = expHot.getData();

    var invoices = cleanArray(invoiceData, paystubHot);
    var overrides = cleanArray(overrideData, overHot);
    var expenses = cleanArray(expenseData, expHot);

    $.each(invoices, function(i, obj){
        var issue = new Date(currentIssueDt);
        if(obj !== null && obj !== undefined){
            var s = setNewSale(obj);
            s.id = i;
            s.agentid = currentAgentId;
            s.issueDate = issue.toLocaleDateString();
            s.wkending = currentWkEnding;
            s.vendor = vendor;
            salesList.push(s);
        }
    });

    $.each(overrides, function(i, obj){
        var issue = new Date(currentIssueDt);
        if(obj !== null && obj !== undefined) {
            var o = setNewOverride(obj);
            o.id = i;
            o.agentid = currentAgentId;
            o.issueDate = issue.toLocaleDateString();
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

    var options = {
        url: '/upload/invoice',
        data: {
            sales: salesList,
            overrides: overList,
            expenses: expensesList
        },
        dataType: 'JSON',
        type: 'POST',
        afterData: afterData
    };

    if(salesList.length){
        fireAjaxRequest(options);
    } else {
        setMessageContainer("Don't forget personal sales!", null, 'danger');
    }


    function afterData(data){

        if(data) {
            setMessageContainer("Success!");
            resetHOT();
        } else {
            var msg = 'Paystub for this date already exists. Please edit instead of creating new invoice.';
            setMessageContainer(msg, null, 'danger');

            $('[data-ax-toast-btn="ok"]').on('click', function(){
                 location.reload();
            });
        }
    }

}


function resetHOT(){
    salesList = [];
    overList = [];
    expensesList = [];
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


function setCommonUserInfo(edit){
    if(edit){
        currentAgentId = $('#employee').data('id');
        currentIssueDt = moment($('#issueDate').data('date'), 'YYYY-MM-DD').format('MM-DD-YYYY');
        currentWkEnding = $('#wkendDate').data('weekending');
        vendor = $('#vendor').data('vendor');
    } else {
        currentAgentId = $('#employee').val();
        currentIssueDt = new Date($('#issueDate').val());
        currentWkEnding = $('#wkendDate').val();
        vendor = $('#vendor').val();
    }
    token = $('meta[name="csrf-token"]').attr('content');
}


function returnInvoiceSearchResults(token){
    inputParams.vendorid = $('#campaignName').val();
    inputParams.issue_date = $('#invoiceDates').val();
    inputParams.agentid = $('#employeeName').val();

    $.ajax({
        url: '/getSearchResults',
        type: 'POST',
        data: {
            _token: token,
            inputParams: inputParams
        },
        dataType: 'html'
    }).done(function(data){
        $('#TABLE_ROWDATA').html(data);
    });
}


function updateExistingInvoice(newToken){
    setCommonUserInfo(true);

    var invoiceData = paystubHot.getData();
    var overrideData = overHot.getData();
    var expenseData = expHot.getData();

    var invoices = cleanArray(invoiceData, paystubHot);
    var overrides = cleanArray(overrideData, overHot);
    var expenses = cleanArray(expenseData, expHot);

    $.each(invoices, function(i, obj){
        var issue = new Date(currentIssueDt);
        if(obj !== null && obj !== undefined){
            var s = setNewSale(obj);
            s.id = i;
            s.agentid = currentAgentId;
            s.issueDate = issue.toLocaleDateString();
            s.wkending = currentWkEnding;
            s.vendor = vendor;
            salesList.push(s);
        }
    });

    $.each(overrides, function(i, obj){
        var issue = new Date(currentIssueDt);
        if(obj !== null && obj !== undefined) {
            var o = setNewOverride(obj);
            o.id = i;
            o.agentid = currentAgentId;
            o.issueDate = issue.toLocaleDateString();
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
        url: '/invoices/editExistingInvoice',
        type: 'POST',
        data: {
            _token: newToken,
            sales: salesList,
            overrides: overList,
            expenses: expensesList
        },
        dataType:'JSON'
    }).done(function(data){

        if(data) {
            setMessageContainer("Success!");
            resetHOT();
        }

    });
}

