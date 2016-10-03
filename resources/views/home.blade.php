@extends('layouts.app')

@section('content')
    <div class="row">
        <div class="col-md-12">
            <span class="pt-25">&nbsp;</span>
        </div>
    </div>
    <div class="row">
        <div class="col-md-10 col-md-offset-1">
            <div class="panel panel-default pt-25">
                <div class="panel-heading">
                    <span class="bg-blue">Dashboard</span>
                </div>

                <div class="panel-body">
                    <a href="{{action('DocumentController@index')}}" class="btn btn-default">Document Manager</a>
                    <a href="{{action('EmpManagerController@index')}}" class="btn btn-default">View Employees</a>
                    <a href="{{action('EmpManagerController@create')}}" class="btn btn-default">Add Employees</a>
                </div>
            </div>
        </div>
    </div>
@endsection