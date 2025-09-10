@extends('dashboard.layout', ['container' => 'container-fluid', 'useWrapper' => true])

@section('title', 'Override Detail')

@section('wrapper-title')
<span data-manager="true" data-managerid="{{$manager->id}}">Override Management</span> <small class="color-white pull-right mt-5">Manager: {{$manager->name}}</small>
@endsection

@section('wrapper-content')

    <div class="box box-default">
        <div class="box-title">
            <div class="row">
                <div class="col-md-8 col-md-offset-2">
                    <h3 class="text-center">Add agents that roll to <strong>{{$manager->name}}</strong> by selecting an agent below:</h3>
                    <input class="contact selectize" type="text" id="employeeList" autocomplete="on" placeholder="Search for Agent" />
                </div>
            </div>
        </div>
        <div class="box-content">
            <div class="row">
                <div class="col-md-8 col-md-offset-2">
                    <div class="table-responsive">
                        <table class="table table-bordered">
                            <thead>
                            <tr class="active">
                                <th class="w-10 text-center"></th>
                                <th>Agent Name</th>
                            </tr>
                            </thead>
                            <tbody id="row-data">
                            @include('overrides._detailRowData', ['children' => $children])
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    </div>

@endsection

@section('scripts')
    <span id="jsobject" hidden>@php echo json_encode($employees); @endphp</span>
    <script src="{{url('js/views/overrides/detail.js')}}"></script>

@endsection