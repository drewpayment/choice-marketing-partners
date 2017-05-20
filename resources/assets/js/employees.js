
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


$(function(){
	var $modal = $('#modal_layout');
	$modal.on('hidden.bs.modal', function(){
		$modal.removeData();
		$modal.html('');
	});
});