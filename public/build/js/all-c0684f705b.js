
/** VARS
   All defined variables used in welcome.js
 */




/** FUNCTIONS
 All defined functions used in welcome.js
 */














/** PAGE LOAD FUNCTIONS
 Page load functions defined in welcome.js
 */


App = (function(){

    var commaClubLinks = '[data-commalink="true"]';

    var init = function() {
        $(commaClubLinks).on('click', function(){
            var id = $(this).data('value');

            var options = {
                url: '/returnCommaClubListByID',
                type: 'POST',
                data: {
                    id: id
                },
                dataType: 'HTML',
                afterData: afterData
            };

            fireAjaxRequest(options);

            function afterData(data){

                var modal = $('#modal_layout');
                modal.html(data);

                modal.on('hidden.bs.modal', function(){
                    modal.removeData();
                    modal.html('');
                }).on('show.bs.modal', function(){

                }).on('shown.bs.modal', function(){

                    $('img').each(function(){
                        var deg = $(this).data('rotate');
                        var rotate = 'rotate('+deg+'deg)';
                        $(this).css({
                            '-webkit-transform': rotate,
                            '-moz-transform': rotate,
                            '-o-transform': rotate,
                            '-ms-transform': rotate,
                            'transform': rotate
                        });
                    });
                }).modal('show');

            }
        });

    };

    return {
        init: init
    }

})(jQuery);


$(document).ready(function(){
    App.init();
});
/**
 * Created by drewpayment on 2/25/17.
 */


function showDeletePaystubConfirmDialog(data){

    $.ajax({
        url: '/paystub/delete/confirm',
        type: 'GET',
        dataType: 'html',
        success: afterData
    });

    function afterData(data){
        remoteModal(data, afterDeleteStubConfirmShow);
    }

}


function afterDeleteStubConfirmShow(){

    // do we need to do anything when the confirmation window is shown?

}


function handleDeletePaystub(data){

    var id = $('#employee').val();
    var date = $('#issueDate').val();
    var token = $('#global-token').attr('content');

    $.ajax({
        url: '/paystub/delete/submit',
        data: {
            _token: token,
            id: id,
            date: date
        },
        type: 'POST',
        dataType: 'json',
        success: afterData
    });

    function afterData(data){
        if(data){
            $('#modal_layout').modal('hide');
            window.location.reload();
        }
    }

}

// vars

var token;
var currentObj;


// methods

function setEmployeeUpdateObj(id){
	return {
		id: id
	}
}


function refreshEmployeesAfterControl(showall){

    var options = {
        url: '/refresh-employees',
        data: {
            showall: showall
        },
        dataType: 'html',
        type: 'POST',
        afterData: afterData
    };

    fireAjaxRequest(options);

    function afterData(data){
        $('#EMPLOYEE_ROWDATA').html(data);
    }

}


function handleEmployeeChangesSubmission(data){
	var props = Object.getOwnPropertyNames(data);
    var emp = setEmployeeUpdateObj(data.id);
	for(var i = 0; i < props.length; i++){
		var p = props[i];
		if(p !== "isactive"){
            if(data[p] === null || data[p] === undefined || data[p] == ""){
                delete data[p];
            }
		}
	}

	emp.id = data.id;
    emp.is_active = (data.isactive) ? 1 : 0;
    if(data.name !== undefined) emp.name = data.name;
	if(data.email !== undefined) emp.email = data.email;
	if(data.phone !== undefined) emp.phone_no = data.phone;
	if(data.address !== undefined) emp.address = data.address;

	var options = {
		url: '/update-employee',
		type: 'POST',
		dataType: 'html',
		data: {
			data: emp
		},
		afterData: afterData
	};

	fireAjaxRequest(options);

	function afterData(data){
		if(data){
			setMessageContainer("Employee updated!");
		}
	}

}


function handleSubmitNewEmployee(data, onlyActive){

	var options = {
		url: '/employee/create-ajax',
		type: 'POST',
		data: {
			data: data
		},
		dataType: 'HTML',
		afterData: afterData
	};

	fireAjaxRequest(options);

	function afterData(data) {
        $('#modal_layout').modal('hide');
        setMessageContainer("The employee was successfully added!");
        refreshEmployeesAfterControl(onlyActive);
    }
}


var salesIDs = {
	9: 'sales_id1',
	10: 'sales_id2',
	11: 'sales_id3'
};


function handleUpdateSalesID(data){
	var item = {
		userId: data.parentid,
		salesId: salesIDs[data.tag],
		value: data.value
	};

	var options = {
		url: '/employee/update/salesid',
		type: 'POST',
		dataType: 'json',
		data: {
			data: JSON.stringify(item)
		},
		afterData: afterData
	};

	fireAjaxRequest(options);

	function afterData(data){
		if(data){
			setMessageContainer("Success!");
		}
	}
}


function setEmployeeUpdateItem(tag){
	return {
        tag: tag,
        id: null,
        name: null,
        email: null,
        phone: null,
        address: null,
        isactive: null,
        token: (token != undefined) ? token : $('[data-token="true"]').data('value')
	}
}


$(function(){
	var $modal = $('#modal_layout');
	$modal.on('hidden.bs.modal', function(){
		$modal.removeData();
		$modal.html('');
	});
});

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





var tag = {

	SUBMIT_INVOICE_BTN: 1,
	SHOW_ALL_EMP: 3,
    CONFIRM_PAYSTUB_DEL: 7,
    DELETE_PAYSTUB: 8

};

// after event controls


function processDataTag(data){
    // data.tag must be coerced, because they're set as string
    switch(+data.tag){
        case tag.SUBMIT_INVOICE_BTN:
            handleSubmitNewInvoice(data);
            break;
        case tag.SHOW_ALL_EMP:
            refreshEmployeesAfterControl(data);
            break;
        case tag.CONFIRM_PAYSTUB_DEL:
            showDeletePaystubConfirmDialog(data);
            break;
        case tag.DELETE_PAYSTUB:
            handleDeletePaystub(data);
            break;
        default:
            break;
    }
}


var handleClick = function(evt){
    evt.stopPropagation();
    var parent, dataList, data, element;

    var $target = $(evt.target);
    if($target.data('vero') != 'button') return false;
    dataList = $target.data();
    data = {};
    data.e = evt.target;

    if(dataList["parentid"] == undefined){
        parent = ($target.closest('[data-parent="true"]').length) ? $target.closest('[data-parent="true"]') : $('[data-parent="true"]');
        data.parent = parent;
        data.parentid = ($(parent).data('parentid') == undefined) ? null : $(parent).data('parentid');
    } else {
        data.parentid = dataList["parentid"];
        data.parent = $('[data-parentid='+data.parentid+'"]').get();
    }

    element = evt.target;
    // Cycle over each attribute on the element
    for (var i = 0; i < element.attributes.length; i++) {
        // Store reference to current attr
        attr = element.attributes[i];
        // If attribute nodeName starts with 'data-'
        if (/^data-/.test(attr.nodeName)) {
            // Log its name (minus the 'data-' part), and its value
            data[attr.nodeName.replace(/^data-/, '')] = attr.nodeValue;
        }
    }

    data.parentid = (data.parentid == null) ? -1 : data.parentid;
    data.tag = (data.tag === undefined) ? $(data.e).closest('[data-tag]').data('tag') : data.tag;

    processDataTag(data);
};


// handles blurs on input elements with "data-vero='text'"
var handleBlur = function(evt){
    evt.stopPropagation();
    var parent, elem, dataList, data, element;

    if($(evt.target).data('vero') != 'text') return false;
    if(evt.target.value == evt.target.defaultValue) return false;

    if(evt.target !== evt.currentTarget){
        elem = $(evt.target);
        dataList = elem.data();
        data = {};

        data.e = evt.target;
        data.value = $(elem).val();

        if(dataList["parentid"] == undefined) {
            parent = (elem.closest('[data-parent="true"]').length > 0) ? elem.closest('[data-parent="true"]') : $('[data-parent="true"]');
            data.parent = parent;
            data.parentid = ($(parent).data('parentid') === undefined) ? null : $(parent).data('parentid');
        } else {
            data.parentid = dataList["parentid"];
            data.parent = $('[data-parentid="'+data.parentid+'"]').get();
        }

        element = evt.target;
        // Cycle over each attribute on the element
        for (var i = 0; i < element.attributes.length; i++) {
            // Store reference to current attr
            attr = element.attributes[i];
            // If attribute nodeName starts with 'data-'
            if (/^data-/.test(attr.nodeName)) {
                // Log its name (minus the 'data-' part), and its value
                data[attr.nodeName.replace(/^data-/, '')] = attr.nodeValue;
            }
        }


        data.parentid = (data.parentid == null) ? -1 : data.parentid;
        data.tag = (data.tag === undefined) ? $(data.e).closest('[data-tag]').data('tag') : data.tag;

    } else {
        elem = $(evt.currentTarget);
        dataList = elem.data();
        data = {};

        data.e = elem;
        data.value = $(elem).val();

        if(dataList["parentid"] == undefined){
            parent = (elem.closest('[data-parent="true"]').length > 0) ? elem.closest('[data-parent="true"]') : $('[data-parent="true"]');
            data.parent = parent;
            data.parentid = ($(parent).data('parentid') === undefined) ? -1 : $(parent).data('parentid');
        } else {
            data.parentid = dataList["parentid"];
            data.parent = $('[data-parentid="'+data.parentid+'"]').get();
        }

        element = evt.currentTarget;
        for(var i = 0; i < element.attributes.length; i++){
            attr = element.attributes[i];
            if(/^data-/.test(attr.nodeName)){
                data[attr.nodeName.replace(/^data-/, '')] = attr.nodeValue;
            }
        }

        data.parentid = (data.parentid == null) ? -1 : data.parentid;
        data.tag = (data.tag === undefined) ? $(data.e).closest('[data-tag]').data('tag') : data.tag;
    }

    processDataTag(data);
};


/**
 * standard method to wire events, bool wireEvent and optionally specify container
 *
 * @param wireEvent
 * @param container
 */
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
            container.addEventListener("click", handleClick);
        }
    }

}


/**
 * set toast notification to show user successful message
 *
 * @param message
 * @param callback
 * @param messageType
 */
var setMessageContainer = function(message, callback, messageType){
    messageType = (messageType === undefined) ? 'primary' : messageType;
    messageType = (messageType === 'error') ? 'danger' : messageType;
    var icon = 'fa fa-thumbs-up';
    var isConfirm = false;
    var width = 200;

    if(messageType == 'danger'){
        icon = 'fa fa-warning';
        isConfirm = true;
        width = 350;
    } else if(messageType == 'info'){
        icon = 'fa fa-info';
    }


    var myToast = new ax5.ui.toast({
        width: width,
        icon: '<i class="'+icon+'"></i>',
        containerPosition: "bottom-right"
    });

    if(isConfirm){
        myToast.confirm({
            theme: messageType,
            msg: message
        })
    } else {
        myToast.push({
            theme: messageType,
            msg: message
        });
    }

    if(callback == typeof 'function') callback.call();
};


/**
 * JavaScript helper functions in website
 */


/**
 * remove empty entries in object array
 * @param data
 * @param hot
 * @returns {{}}
 */
function cleanArray(data, hot) {
    var temp = {};

    $.each(data, function(idx, obj){
       if(!hot.isEmptyRow(idx)) temp[idx] = obj;
    });

    return temp;
}


/**
 * create universal modal within website, pass fillable html to modal and callback function for further action after modal is shown
 *
 * @param html
 * @param callback
 */
function remoteModal(html, callback){
    var modal = $('#modal_layout');
    modal.html(html);

    modal.on('hidden.bs.modal', function(){
        modal.removeData();
        modal.html('');
    }).on('shown.bs.modal', function(){
        if(callback === typeof 'function') callback.call();
    }).modal('show');

}


/**
 * handle ajax requests that return an error
 * @param data
 */
function ajaxErrorHandler(data){
    console.log(data.statusText);
    console.dir(data);
}


function ajaxSuccessHandler(data){
    console.log("The success handler was not defined.");
    console.dir(data);
}


/**
 * standard ajax request handler
 * @param options
 */
function fireAjaxRequest(options){
    if(options === undefined) ajaxErrorHandler("Options object is undefined.");

    var settings = {
        url: (options.url === undefined) ? null : options.url,
        type: (options.type === undefined) ? 'GET' : options.type,
        data: (options.data === undefined) ? {} : options.data,
        dataType: (options.dataType === undefined) ? 'JSON' : options.dataType,
        success: (options.afterData === undefined) ? ajaxSuccessHandler : options.afterData,
        error: ajaxErrorHandler
    };

    $.ajax(settings);
}
/**
 * Created by drewpayment on 3/12/17.
 * Dashboard view for Admin users
 */


// build sales by week highchart on page load
$(document).ready(function(){
    if(!$('#salesByWeek').length) return false;
    var a = JSON.parse($('#salesByWeek').find('.jsdata').text()),
        xAxis = [],
        series1 = [],
        series2 = [],
        series3 = [],
        series4 = [], d,
        visibility = [];

    for(var i = 0; i < a.xAxis.length; i++){
        d = a.xAxis[i];
        var item = moment(d.issue_date, 'YYYY-M-D').format('MMM Do').toString();
        xAxis.push(item);
    }

    // accepted sales
    for(var i = 0; i < a.xAxis.length; i++){
        var acc = (a.accepted == undefined) ? 0 : a.accepted[i],
            rej =(a.rejected == undefined) ? 0 : a.rejected[i],
            chg = (a.chargebacks == undefined) ? 0 : a.chargebacks[i],
            unc = (a.uncategorized == undefined) ? 0 : a.uncategorized[i];

        if(acc == null || acc == undefined){
            series1.push(null);
        } else {
            series1.push(acc.saleCount);
        }

        if(rej == null || rej == undefined){
            series2.push(null);
        } else {
            series2.push(rej.saleCount);
        }

        if(chg == null || chg == undefined){
            series3.push(null);
        } else {
            series3.push(chg.saleCount);
        }

        if(unc == null || unc == undefined){
            series4.push(null);
        } else {
            series4.push(unc.saleCount);
        }
    }

    // this figures out if the series has all empty points in it,
    // and if it does, sets the series' visibility to default to false on the graph
    var allSeries = [series1, series2, series3, series4];
    for(var i = 0; i < 4; i++){
        visibility[i] = (allSeries[i].every(isUndefined)) ? false : true;
    }

    var options = {
        chart: {
            type: 'column'
        },
        credits: {
            enabled: false
        },
        title: {
            text: null
        },
        xAxis: {
            categories: xAxis
        },
        yAxis: {
            title: {
                text: null
            }
        },
        plotOptions: {
            stacking: 'normal'
        },
        tooltip: {
            borderColor: '#000000',
            formatter: function () {
                var s = '<b>'+this.x+'</b>';
                $.each(this.points, function(i, point){
                    s += '<br/><h3 class="bold" style="color:'+point.series.color+';">'+point.series.name+': '+point.y+'</h3>';
                });
                return s;
            },
            shared: true
        },
        series: [{
            name: "Accepted",
            data: series1,
            color: '#19b73e',
            visible: visibility[0]
        }, {
            name: "Rejected",
            data: series2,
            color: '#9e9e9e',
            visible: visibility[1]
        }, {
            name: 'Chargebacks',
            data: series3,
            color: '#f20707',
            visible: visibility[2]
        }, {
            name: 'Uncategorized',
            data: series4,
            color: '#8c6b6b',
            visible: visibility[3]
        }]
    };

    $('#salesByWeek').highcharts(options);

});


var isUndefined = function(elem){
    return elem == undefined;
};


function handlePaidConfirmClick(data){
    var userId = data.parentid;
    var isPaid = data.value;
    token = $('#global-token').attr('content');

    isPaid = (isPaid) ? 1 : 0;

    $.ajax({
        url: 'handlePayrollClick',
        type: 'POST',
        dataType: 'json',
        data: {
            userId: userId,
            isPaid: isPaid,
            _token: token
        },
        success: afterData
    });

    function afterData(data){
        if(data){
            setMessageContainer("Success!");
        }
    }
}


function refreshPayrollInfoTable(data){
    var date = data.value;
    token = (token) ? token : $('#global-token').attr('content');

    date = moment(date, 'MM-DD-YYYY');
    date = date.format('YYYY-MM-DD').toString();

    $.ajax({
        url: 'refreshPayrollInfo',
        type: 'GET',
        dataType: 'html',
        data: {
            date: date
        },
        success: afterData
    });

    function afterData(data){
        if(data){
            $('#TABLE_ROWDATA').html(data);
        }
    }
}
//# sourceMappingURL=all.js.map
