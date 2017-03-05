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
var userMsg = $('#js_msgs');


// methods

function setEmployeeUpdateObj(id){
	return {
		id: id
	}
}

function refreshEmployeesAfterControl(data){

	var el = $(data.e),
		showall;

	if(data.value == 0){
		el.data('value', 1);
		el.addClass('active');
		showall = true;
	} else {
		el.data('value', 0);
		el.removeClass('active');
		showall = false;
	}

    token = (token == undefined) ? $(data.e).data('showtoken') : token;

	$.ajax({
		url: 'refresh-employees',
		type: 'POST',
		dataType: 'html',
		data: {
			showall: showall,
			_token: token
		},
		success: afterData
	});

	function afterData(data){

		$.when($('#EMPLOYEE_ROWDATA').html(data)).then(function(){
            var elem = $('[data-tag="3"]');
            if(showall){
                elem.removeAttr('data-value');
                elem.attr('data-value', 1);
                elem.addClass('active');
            } else {
                elem.removeAttr('data-value');
                elem.attr('data-value', 0);
                elem.removeClass('active');
            }

            wireButtonEvents(true, null);
		});
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
	data.token = (data.token == undefined) ? $(data.e).closest('[data-token="true"]').data('value') : data.token;

	$.ajax({
		url: '/update-employee',
		type: 'POST',
		dataType: 'html',
		data: {
			_token: data.token,
			data: emp
		}, success: afterData
	});


	function afterData(data){
		console.dir(data);
	}

}

function showEmployeeInfoModal(data){

	token = $('[data-token="true"]').data('value');
	data.value = (data.value == undefined) ? $(data.e).closest('[data-value]').data('value') : data.value;

    $.ajax({
        url: './editemployee/',
        type: 'POST',
        dataType: "html",
        data: {
            id: data.value,
            _token: token
        },
		success: afterData
    });

    function afterData(result){
        remoteModal(result, afterShowEmployeeChangeModal);
	}
}


function showAddNewEmployeeModal(data){

    token = $('[data-token="true"]').data('value');
    data.value = (data.value == undefined) ? $(data.e).closest('[data-value]').data('value') : data.value;

    $.ajax({
        url: '/employees/create',
        type: 'GET',
        dataType: "html",
        success: afterData
    });

    function afterData(result){
        remoteModal(result, afterAddEmpModalShow);
    }
}


function handleSubmitNewEmployee(data){

	$.ajax({
		url: '/employee/create-ajax',
		type: 'POST',
		dataType: "html",
		data: {
			_token: token,
			data: data
		},
		success: afterData
	});

	function afterData(data){
		if(data){
			var obj = {
				e: $('[data-tag="3"]')
			};

            refreshEmployeesAfterControl(obj);

			setUserMessage("The employee was successfully added!");
		}
	}

}


var salesIDs = {
	9: 'sales_id1',
	10: 'sales_id2',
	11: 'sales_id3'
};


function handleUpdateSalesID(data){
	token = $('[data-token="true"]').data('value');
	var item = {
		userId: data.parentid,
		salesId: salesIDs[data.tag],
		value: data.value
	};

	$.ajax({
		url: '/employee/update/salesid',
		type: 'POST',
		dataType: 'json',
		data: {
			_token: token,
			data: JSON.stringify(item)
		},
		success: afterData
	});

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


function afterAddEmpModalShow(){
	$('[data-tag="6"]').on('click', function(e){
		e.stopImmediatePropagation();
		var item = setEmployeeUpdateItem(6);
		item.name = $('#empName').val();
		item.email = $('#empEmail').val();
		item.address = $('#empAddress').val();
		item.phone = $('#empPhone').val();
		item.isactive = true;

		$.when(processDataTag(item)).then(function(){
			$('#modal_layout').modal('hide');
		});
	});
}


function afterShowEmployeeChangeModal(){
	$('[data-tag="4"]').on('click', function(e){
		e.stopImmediatePropagation();
		var data = {
			tag: 4,
			id: $('[data-parentid]').data('parentid'),
			name: $('#emp_name').val(),
			email: $('#emp_email').val(),
			phone: $('#emp_phone').val(),
			address: $('#emp_address').val(),
            isactive: $('#emp_active').prop('checked'),
			token: $('[data-token="true"]').data('value')
        };

		$.when(processDataTag(data)).then(function(){
			$('#modal_layout').modal('hide');
			window.location.reload();
		});
	})
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

        if(data) {
            setMessageContainer("Success!");
            resetHOT();
        }

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






var tag = {

	SUBMIT_INVOICE_BTN: 1,
	SHOW_EDIT_EMP_MODAL: 2,
	SHOW_ALL_EMP: 3,
    SUBMIT_EMP_CHANGES: 4,
    SHOW_ADD_EMP_MODAL: 5,
    SUBMIT_NEW_EMPLOYEE: 6,
    CONFIRM_PAYSTUB_DEL: 7,
    DELETE_PAYSTUB: 8,
    UPDATE_SALES_ONE: 9,
    UPDATE_SALES_TWO: 10,
    UPDATE_SALES_THREE: 11

};

// after event controls


function processDataTag(data){
    // data.tag must be coerced, because they're set as string
    switch(+data.tag){
        case tag.SUBMIT_INVOICE_BTN:
            handleSubmitNewInvoice(data);
            break;
        case tag.SHOW_EDIT_EMP_MODAL:
            showEmployeeInfoModal(data);
            break;
        case tag.SUBMIT_EMP_CHANGES:
            handleEmployeeChangesSubmission(data);
            break;
        case tag.SHOW_ALL_EMP:
            refreshEmployeesAfterControl(data);
            break;
        case tag.SHOW_ADD_EMP_MODAL:
            showAddNewEmployeeModal(data);
            break;
        case tag.SUBMIT_NEW_EMPLOYEE:
            handleSubmitNewEmployee(data);
            break;
        case tag.CONFIRM_PAYSTUB_DEL:
            showDeletePaystubConfirmDialog(data);
            break;
        case tag.DELETE_PAYSTUB:
            handleDeletePaystub(data);
            break;
        case tag.UPDATE_SALES_ONE:
            handleUpdateSalesID(data);
            break;
        case tag.UPDATE_SALES_TWO:
            handleUpdateSalesID(data);
            break;
        case tag.UPDATE_SALES_THREE:
            handleUpdateSalesID(data);
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
            container.addEventListener("click", handleClick);
        }
    }

}



var setMessageContainer = function(message, callback){
    var myToast = new ax5.ui.toast({
        width: 200,
        icon: '<i class="fa fa-thumbs-up"></i>',
        containerPosition: "bottom-right"
    });

    myToast.push({
        theme: 'primary',
        msg: message
    });

    if(callback == typeof 'function') callback.call();
};




// JS helper functions

function cleanArray(data, hot) {
    var temp = {};

    $.each(data, function(idx, obj){
       if(!hot.isEmptyRow(idx)) temp[idx] = obj;
    });

    return temp;

}

function remoteModal(html, callback){
    var modal = $('#modal_layout');

    $.when(modal.html(html)).then(function(){
        modal.on('shown.bs.modal', function(){
            callback();
        }).modal('show');
    });
}
//# sourceMappingURL=all.js.map
