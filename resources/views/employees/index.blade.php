@extends('layouts.app')

@section('title', 'Agents')

@section('content')


    <div class="row">
        <div class="col-xs-10 col-xs-offset-1">
            <div class="box box-default">
                <div class="box-title bg-primary">
                    <h2>Choice Marketing Agents</h2>
                </div>
                <div class="box-content">
                    <div class="box-content-title">
                        <button type="button" class="btn btn-primary"><i class="fa fa-eye"></i> All</button>
                        <button type="button" class="btn btn-primary" data-toggle="modal" data-target="#create-employee-modal"><i class="fa fa-plus"></i> Agent</button>
                    </div>

                    <div class="row">
                        <div class="col-xs-12 mh-500 overflow-scroll">
                            <table class="table table-condensed table-bordered">
                                <thead>
                                <tr class="bg-primary">
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Phone</th>
                                    <th>Active</th>
                                    <th class="text-right">Created</th>
                                    <th class="text-right">Last Modified</th>
                                </tr>
                                </thead>
                                <tbody id="row-data">
                                @include('employees.partials._employeetablerowdata', ['employees' => $employees])
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    @include('employees.partials.createaemployeemodal')

@endsection

@section('scripts')
    <script src="/js/conf/all.js"></script>
    <script type="text/javascript">
        $(document).on('click', '[data-id="edit-agent"]', function(){
            alert('clicked agent!');
        });
    </script>

@endsection