var registerSaveEmployeeEditHandler = function(){
    var modal = $('#modal_layout');

    $(document).on('click', '[data-action="save-employee-changes"]', function(){
        var form = $('form#emp_id');
        var params = {
            id: form.data('parentid'),
            name: form.find('#emp_name').val(),
            email: form.find('#emp_email').val(),
            phone: form.find('#emp_phone').val(),
            address: form.find('#emp_address').val(),
            isActive: form.find('#emp_active').is(':checked') === true,
            isManager: form.find('#is_mgr').is(':checked') === true
        };

        var options = {
            url: '/updateExistingEmployeeCRUD',
            type: 'POST',
            dataType: 'json',
            data: params,
            success: afterData
        };

        fireAjaxRequest(options);

        function afterData(data){
            modal.modal('hide');
            if(data){
                setMessageContainer('Success!');
            } else {
                setMessageContainer('Something went wrong. Please try again later.', null, 'danger');
            }
        }
    });

};

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
        modal.on('hidden.bs.modal', function(){

            modal.html('');

        }).on('shown.bs.modal', function(){

            registerSaveEmployeeEditHandler();

        }).modal('show');

    }
});