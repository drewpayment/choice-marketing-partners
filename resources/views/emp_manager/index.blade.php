@extends('layouts.app')

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
            <div class="hidden" data-token="true" data-value="{{csrf_token()}}"></div>
            <ul class="list-unstyled list-inline">
                <li>
                    <button type="button" class="btn btn-sm btn-primary" data-vero="button" data-tag="3" data-showtoken="{{csrf_token()}}" data-value="0" >
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

    $(document).ready(function(){
//        $(document).on('click', '[data-form="true"]', handleClick);
        $(document).on('focusout', '[data-form="true"]', handleBlur);
        //$(document).on('click', 'button', handleClick);
    });


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


    $(document).on('click', '[data-tag="4"]', function(e){
        var data = {
            tag: 4,
            id: $('#emp_id').data('parentid'),
            name: $('#emp_name').val(),
            email: $('#emp_email').val(),
            phone: $('#emp_phone').val(),
            address: $('#emp_address').val(),
            isactive: $('#emp_active').prop('checked')
        };

        processDataTag(data);
        $('#modal_layout').modal('hide');
        refreshEmployeeRowData();
    });


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

    $(document).on('click', '[data-tag="6"]', function(){
        var item = setEmployeeUpdateItem(6);
        item.name = $('#empName').val();
        item.email = $('#empEmail').val();
        item.address = $('#empAddress').val();
        item.phone = $('#empPhone').val();
        item.isactive = true;

        handleSubmitNewEmployee(item);
        $('#modal_layout').modal('hide');
//        refreshEmployeeRowData();
    });


    $('#showInactive').on('click', function(){
        $.ajax({
            dataType: 'html',
            url: '/getemployees'
        }).done(function(data){
            if(data.data){
                var content = JSON.stringify(data.data);
                $('tbody').html(content);
            }
        }).fail(function(event){
            console.log('We failed to update the page. Please try again.');
            console.dir(event);
        });
    });
</script>

@endsection