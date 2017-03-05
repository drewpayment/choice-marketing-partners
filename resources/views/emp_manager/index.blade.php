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
        wireButtonEvents(true, null);

        $(document).on('focusout', 'input', handleBlur);
    });


    var url = window.location.href;
    $('#showInactive').on('click', function(){
        $.ajax({
            dataType: 'html',
            url: url + '/getemployees'
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