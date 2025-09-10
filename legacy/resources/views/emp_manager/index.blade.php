@extends('layouts.app')

@section('title', 'Employees')

@section('content')

    <div class="row">
        <div class="col-md-10 col-md-offset-1">
            <div class="page-header">
                <h2>Current Associates</h2>
            </div>
        </div>
    </div>

    <div class="row">
        <div class="col-md-10 col-md-offset-1">
            <ul class="list-unstyled list-inline">
                <li>
                    <button type="button" class="btn btn-sm btn-primary" data-vero="button" data-tag="3" data-value="false">
                        Show All
                    </button>
                </li>
                <li>
                    <button type="button" class="btn btn-sm btn-primary" data-vero="button" data-tag="5">
                        Add New
                    </button>
                </li>
            </ul>

        </div>
    </div>

    <div class="row">
        <div class="col-md-11 col-md-offset-1">
            <table class="table table-condensed">
                <thead>
                <tr>
                    <th class="w-20"></th>
                    <th class="w-160">Name</th>
                    <th class="w-300">Email</th>
                    <th class="w-80">Phone No</th>
                    <th class="text-center w-30">Active</th>
                    <th class="text-center">Sales ID One</th>
                    <th class="text-center">Sales ID Two</th>
                    <th class="text-center">Sales ID Three</th>
                </tr>
                </thead>
                <tbody id="EMPLOYEE_ROWDATA">
                    @include('emp_manager._emp', array('employees' => $employees))
                </tbody>
            </table>
        </div>
    </div>

@endsection

@section('scripts')

<script>

    var onlyActive = 1;


    // edit existing employee
    $(document).on('click', '[data-tag="2"]', function(){

        var options = {
            url: '/editemployee',
            type: 'POST',
            dataType: 'HTML',
            data: {
                id: $(this).data('value')
            },
            afterData: afterData
        };

        fireAjaxRequest(options);

        function afterData(result){
            remoteModal(result, null);
        }
    });


    // submit employee changes
    $(document).on('click', '[data-tag="4"]', function(e){
        var data = {
            tag: 4,
            id: $('#emp_id').data('parentid'),
            name: $('#emp_name').val(),
            email: $('#emp_email').val(),
            phone: $('#emp_phone').val(),
            address: $('#emp_address').val(),
            isactive: $('#emp_active').prop('checked'),
            ismgr: $('#is_mgr').prop('checked')
        };

        handleEmployeeChangesSubmission(data);
        $('#modal_layout').modal('hide');
        refreshEmployeesAfterControl(onlyActive);
    });


    // show new employee modal
    $(document).on('click', '[data-tag="5"]', function(){
         var options = {
             url: '/employees/create',
             type: 'GET',
             dataType: 'HTML',
             afterData: afterData
         };

         fireAjaxRequest(options);

         function afterData(data){
             remoteModal(data, null);
         }
    });

    // send new employee data
    $(document).on('click', '[data-tag="6"]', function(){
        var item = setEmployeeUpdateItem(6);
        item.name = $('#empName').val();
        item.email = $('#empEmail').val();
        item.address = $('#empAddress').val();
        item.phone = $('#empPhone').val();
        item.isactive = true;

        handleSubmitNewEmployee(item, onlyActive);
    });

    // show all employees toggle button
    $(document).on('click', '[data-tag="3"]', function(){
        var showBool = $(this).data('value');

        if(showBool){
            onlyActive = 1;
            $(this).data('value', false).attr('data-value', false);
        } else {
            onlyActive = 0;
            $(this).data('value', true).attr('data-value', true);
        }

        $(this).toggleClass('active');

        refreshEmployeesAfterControl(onlyActive)
    });

    // update employee sales id
    $(document).on('change', 'input[data-vero="text"]', function(){

        var data = {
            parentid: $(this).closest('[data-parent="true"]').data('parentid'),
            tag: $(this).data('tag'),
            value: $(this).val()
        };

        handleUpdateSalesID(data);
    });
</script>

@endsection