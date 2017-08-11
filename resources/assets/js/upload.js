
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
    var amt = sanitizeCurrency(s[6]);

    return {
        date: s[0],
        name: {
            first: s[1],
            last: s[2]
        },
        address: s[3],
        city: s[4],
        status: s[5],
        amount: amt
    };
};


var setNewOverride = function (o){
    var amt = sanitizeCurrency(o[3]);

    return {
        name: o[0],
        numOfSales: o[1],
        commission: o[2],
        total: amt
    };
};


var setNewExpense = function (e){
    var amt = sanitizeCurrency(e[1]);

    return {
        type: e[0],
        amount: amt,
        notes: e[2]
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


function updateExistingInvoice(){
    setCommonUserInfo(true);

    var payrollData = {
        agentID: currentAgentId,
        issueDate: currentIssueDt,
        weekEnding: currentWkEnding,
        vendor: vendor
    };

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
        url: '/invoices/editExistingInvoice',
        type: 'POST',
        data: {
            sales: salesList,
            overrides: overList,
            expenses: expensesList,
            payrollData: payrollData
        },
        afterData: afterData
    };

    fireAjaxRequest(options);

    function afterData(data){

        if(data){
            setMessageContainer("Success!");
            resetHOT();
        }
    }

}

