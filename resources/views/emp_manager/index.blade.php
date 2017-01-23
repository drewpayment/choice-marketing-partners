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
            <ul class="list-unstyled list-inline">
                <li>
                    <button type="button" id="showInactive" class="btn btn-sm btn-primary" data-toggle="button" aria-pressed="false" autocomplete="off">
                        Show All
                    </button>
                </li>
                <li>
                    <a href="{{ url('/employees/create') }}" class="btn btn-sm btn-primary">
                        Add New
                    </a>
                </li>
            </ul>

        </div>
    </div>

    <div class="row">
        <div class="col-md-11 col-md-offset-1">
            <table class="table table-condensed">
                <thead>
                <th></th>
                <th>Name</th>
                <th>Email</th>
                <th>Phone No</th>
                <th class="text-center">Active</th>
                <th>Address</th>
                </thead>
                <tbody>
                    @include('emp_manager._emp', array('employees' => $employees))
                </tbody>
            </table>
        </div>
    </div>

@endsection

@section('scripts')

<script>
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