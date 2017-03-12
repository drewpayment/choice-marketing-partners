@extends('layouts.app')

@section('title', 'Admin Dashboard')

@section('content')


    <div class="row">
        <div class="col-xs-12">
            <blockquote>
                <h2>"Our greatest weakness lies in giving up. The most certain way to succeed is always to try just one more time." <small>Thomas Edison</small></h2>
            </blockquote>
        </div>
    </div>
    <div>
        <div class="col-xs-6">
            <div class="panel panel-primary">
                <div class="panel-heading">
                    <h3 class="panel-title">Sales by Week</h3>
                </div>
                <div class="panel-body" id="salesByWeek">
                    <div class="jsdata">{{$jsdata}}</div>
                </div>
            </div>
        </div>
        <div class="col-xs-6">
            <div class="panel panel-primary">
                <div class="panel-heading">
                    <h3 class="panel-title">Graph Title</h3>
                </div>
                <div class="panel-body">
                    this where the graph will go
                </div>
            </div>
        </div>
    </div>


@endsection


@section('scripts')

    <script src="https://code.highcharts.com/highcharts.js"></script>
    <script src="https://code.highcharts.com/highcharts-more.js"></script>

@endsection