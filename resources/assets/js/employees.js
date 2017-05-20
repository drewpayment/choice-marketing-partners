
// vars

var token;
var currentObj;


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

	$.ajax({
		url: 'refresh-employees',
		type: 'POST',
		dataType: 'html',
		data: {
			showall: showall
		},
		success: afterData
	});

	function afterData(data){
        $('#EMPLOYEE_ROWDATA').html(data);
        var elem = $('[data-tag="3"]');
        if(showall){
            elem.removeAttr('data-value');
            elem.attr('data-value', 1).data('value', 1);
            // elem.addClass('active');
        } else {
            elem.removeAttr('data-value');
            elem.attr('data-value', 0).data('value', 0);
            // elem.removeClass('active');
        }

        elem.toggleClass('active');

        wireButtonEvents(true, null);
	}

}


function refreshEmployeeRowData(){
	var showAll = $('[data-tag="3"]').data('value');

	var options = {
		url: '/returnEmployeeRowData',
		type: 'POST',
		dataType: 'HTML',
		data: {
			showAll: showAll
		},
		afterData: afterData
	};

	fireAjaxRequest(options, null);

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
		if(data){
			setMessageContainer("Employee updated!");
		}
	}

}


function handleSubmitNewEmployee(data){

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
        var obj = {
            e: $('[data-tag="3"]')
        };

        refreshEmployeesAfterControl(obj);

        setMessageContainer("The employee was successfully added!");
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


// function afterAddEmpModalShow(){
// 	$('[data-tag="6"]').on('click', function(e){
//
// 		var item = setEmployeeUpdateItem(6);
// 		item.name = $('#empName').val();
// 		item.email = $('#empEmail').val();
// 		item.address = $('#empAddress').val();
// 		item.phone = $('#empPhone').val();
// 		item.isactive = true;
//
// 		$.when(processDataTag(item)).then(function(){
// 			$('#modal_layout').modal('hide');
// 		});
// 	});
// }
//
//
// function afterShowEmployeeChangeModal(){
// 	$('[data-tag="4"]').on('click', function(e){
// 		e.stopImmediatePropagation();
// 		var data = {
// 			tag: 4,
// 			id: $('#emp_id').data('parentid'),
// 			name: $('#emp_name').val(),
// 			email: $('#emp_email').val(),
// 			phone: $('#emp_phone').val(),
// 			address: $('#emp_address').val(),
//             isactive: $('#emp_active').prop('checked'),
// 			token: $('[data-token="true"]').data('value')
//         };
//
// 		$.when(processDataTag(data)).then(function(){
// 			$('#modal_layout').modal('hide');
// 			window.location.reload();
// 		});
// 	})
// }

$(function(){
	var $modal = $('#modal_layout');
	$modal.on('hidden.bs.modal', function(){
		$modal.removeData();
		$modal.html('');
	});
});