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
        <div class="col-md-6">
            <div class="panel panel-primary">
                <div class="panel-heading">
                    <h3 class="panel-title">Sales by Week</h3>
                </div>
                <div class="panel-body" id="salesByWeek">
                    <div class="jsdata">{{$jsdata}}</div>
                </div>
            </div>
        </div>
        <div class="col-md-6">
            <ul class="list-unstyled">
                <li>
                    <div class="panel panel-primary h-225 overflow-scroll">
                        <div class="panel-heading">
                            <h3 class="panel-title">Top Performers - Invoice Week of {{date('M jS', strtotime('last wednesday'))}}</h3>
                        </div>
                        <table class="table">
                            <thead>
                            <tr>
                                <th>Name</th>
                                <th class="w-80"># of Sales</th>
                            </tr>
                            </thead>
                            <tbody>
                            <tr>
                                <td>Bret Payment</td>
                                <td class="text-center">15</td>
                            </tr>
                            </tbody>
                        </table>
                    </div>
                </li>
                <li>
                    <div class="panel panel-danger h-225 overflow-scroll">
                        <div class="panel-heading">
                            <h3 class="panel-title">Underperformers</h3>
                        </div>
                        <table class="table">
                            <thead>
                            <tr>
                                <th>Name</th>
                                <th class="w-80"># of Sales</th>
                            </tr>
                            </thead>
                            <tbody>
                            <tr>
                                <td>Drew Payment</td>
                                <td class="text-center">-4</td>
                            </tr>
                            </tbody>
                        </table>
                    </div>
                </li>
            </ul>
        </div>
    </div>


@endsection


@section('scripts')

    <script src="https://code.highcharts.com/highcharts.js"></script>
    <script src="https://code.highcharts.com/highcharts-more.js"></script>

@endsection