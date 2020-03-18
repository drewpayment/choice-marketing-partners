@extends('dashboard.layout', ['container' => 'container-fluid', 'useWrapper' => true])

@section('title', 'Agents')

@section('wrapper-title', 'Agents')

@section('wrapper-content')

    <cp-agents-list></cp-agents-list>

    <!-- <div class="box box-default">
        <div class="box-title desktop-only">
            <button type="button" class="btn btn-primary" data-toggle="button" id="show-all-employees"><i class="fa fa-eye"></i> All</button>
            <button type="button" class="btn btn-primary" data-action="create-employee-modal"><i class="fa fa-plus"></i> Agent</button>
        </div>
        <div class="box-content">
            <div class="desktop-only">
                <table class="table table-bordered fixed_headers" style="width:960px;" id="table-body">
                    <thead>
                    <tr class="bg-primary">
                        <th>Name</th>
                        <th>Email</th>
                        <th>Phone</th>
                        <th>Active</th>
                        <th class="text-right">Created</th>
                        <th class="text-right">Modified</th>
                    </tr>
                    </thead>
                    <tbody id="row-data">
                    @include('employees.partials._employeetablerowdata', ['employees' => $employees])
                    </tbody>
                </table>
            </div>
            <div class="mobile-only">
                @foreach($employees as $e)
                    <div class="list-group">
                        <div class="list-group-item" data-parent="true" data-parentid="{{$e->id}}">
                            <div class="list-group-item-heading">
                                <a href="#" data-action="edit-agent">
                                    <i class="fa fa-user"></i> {{$e->name}}
                                </a>
                            </div>
                            <div class="list-group-item-text">
                                <label for="emp_active">Active</label>
                                <input type="checkbox" id="emp_active" {{(($e->is_active == 1) ? "checked" : "")}} />
                            </div>
                        </div>
                    </div>
                @endforeach
            </div>
        </div>
    </div>

    @include('employees.partials.createaemployeemodal') -->

@endsection

@section('scripts')
    <script src="/js/conf/all.js"></script>
@endsection