/**
 * Display employee detail to make edits if necessary.
 */
$(document).on('click', '[data-action="edit-agent"]', function(){
    var id = $(this).closest('[data-parent="true"]').data('parentid');

    var options = {
        url: '/getExistingEmployeeModal',
        type: 'GET',
        dataType: 'html',
        data: {
            id: id
        },
        success: afterData
    };

    fireAjaxRequest(options);

    function afterData(data){
        var modal = $('#modal_layout');
        modal.html(data);
        modal.on('hidden.bs.modal', function(e){
            e.stopPropagation();
            $(document).off('click', '[data-action="save-employee-changes"]'); // unregister event handler for updating employee

            modal.html('').off();
            refreshEmployees();

        }).on('shown.bs.modal', function(){

            registerSaveEmployeeEditHandler();

        }).modal('show');

    }
});

/**
 * Handle updating existing employee.
 */
var registerSaveEmployeeEditHandler = function(){
    var modal = $('#modal_layout');

    $(document).on('click', '[data-action="save-employee-changes"]', function(){
        var form = modal.find('form');

        var params = {
            id: form.data('parentid'),
            name: form.find('#emp_name').val(),
            email: form.find('#emp_email').val(),
            phoneNo: form.find('#emp_phone').val(),
            address: form.find('#emp_address').val(),
            isActive: form.find('#emp_active').is(':checked') ? 1 : 0,
            isMgr: form.find('#is_mgr').is(':checked') ? 1 : 0,
            salesId1: form.find('#sales_id1').val(),
            salesId2: form.find('#sales_id2').val(),
            salesId3: form.find('#sales_id3').val()
        };

        var options = {
            url: '/updateExistingEmployee',
            type: 'POST',
            dataType: 'json',
            data: params,
            afterData: afterData
        };

        fireAjaxRequest(options);

        function afterData(data){
            modal.modal('hide');
            if(data){
                setMessageContainer('Success!');
            } else {
                setMessageContainer('Sorry, looks like something went wrong. Please try again.', null, 'danger');
            }
        }
    });
};

/*
 * Show modal to create new employee
 */
$(document).on('click', '[data-action="create-employee-modal"]', function(){
    var modal = $('#create-employee-modal');

    modal.on('hidden.bs.modal', function(){
        modal.off();
        $(document).off('click', '[data-action="save-new-employee"]');
        refreshEmployees();
    }).on('shown.bs.modal', function(){
        registerSaveEmployeeCreateHandler();
    }).modal('show');
});

/**
 * Handle creating new employee
 */
var registerSaveEmployeeCreateHandler = function(){
    var modal = $('#create-employee-modal');
    $(document).on('click', '[data-action="save-new-employee"]', function(){
        var params = {
            name: $('#emp_name').val(),
            email: $('#emp_email').val(),
            phoneNo: $('#emp_phone').val(),
            address: $('#emp_address').val(),
            isMgr: $('#is_mgr').is(':checked') ? 1 : 0,
            salesId1: $('#sales_id1').val(),
            salesId2: $('#sales_id2').val(),
            salesId3: $('#sales_id3').val()
        };

        var options = {
            url: '/createNewEmployee',
            type: 'POST',
            dataType: 'json',
            data: params,
            afterData: afterData
        };

        fireAjaxRequest(options);

        function afterData(data){
            modal.modal('hide');
            if(data){
                setMessageContainer('Saved successfully!');
            } else {
                setMessageContainer('Sorry, looks like something went wrong. Please try again!', null, 'danger');
            }
        }
    });
};


/**
 * Refresh employee row data.
 */
var refreshEmployees = function(){
    var params = {
        showAll: $('#show-all-employees').hasClass('active')
    };

    var options = {
        url: '/refreshEmployees',
        type: 'GET',
        dataType: 'html',
        data: params,
        afterData: afterData
    };

    fireAjaxRequest(options);

    function afterData(data){
        if(data){

            $('#row-data').html(data);

        } else {
            setMessageContainer('Sorry, looks like we had an issue refreshing your employee list. Please refresh the page.', null, 'danger');
        }
    }
};

/**
 * Toggle show all employees button
 */
$(document).on('click', '#show-all-employees', refreshEmployees);


$(document).on('click', '#emp_active', function(){
    var elem = $(this);

    var params = {
        id: elem.closest('[data-parent="true"]').data('parentid'),
        active: elem.is(':checked')
    };

    var options = {
        url: '/updateEmployeeStatus',
        type: 'POST',
        dataType: 'json',
        data: params,
        afterData: afterData
    };

    fireAjaxRequest(options);

    function afterData(data){
        if(data){
            setMessageContainer('This employee has been updated.');
        }
    }
});




//# sourceMappingURL=all.js.map
