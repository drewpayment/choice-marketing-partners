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
            <div class="panel panel-primary overflow-scroll">
                <div class="panel-heading">
                    <button type="button" class="btn btn-default btn-xs pull-right" data-toggle="collapse" data-target="#admin_body"><i class="ion ion-plus-round" id="close-icon"></i></button>
                    <div class="panel-title">Administration</div>
                </div>

                <div id="admin_body" class="list-group collapse">
                    <a class="list-group-item" href="{{url('/dashboards/payroll-info')}}">Payroll Info</a>
                    <a class="list-group-item" href="{{url('/invoices/edit-invoice')}}">Edit Invoice</a>
                    <a class="list-group-item" href="#">&nbsp;</a>
                </div>

            </div>
        </div>
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
    </div>


@endsection


@section('scripts')

    <script src="https://code.highcharts.com/highcharts.js"></script>
    <script src="https://code.highcharts.com/highcharts-more.js"></script>
    <script type="text/javascript">
        $('#admin_body').on('shown.bs.collapse', function(){
            $('#close-icon').removeClass('ion ion-plus-round').addClass('ion ion-close-round');
        }).on('hidden.bs.collapse', function(){
            $('#close-icon').removeClass('ion ion-close-round').addClass('ion ion-plus-round');
        });
    </script>

@endsection