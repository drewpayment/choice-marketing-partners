@extends('layouts.app', ['containerClass' => 'container-fluid'])

@section('title', 'Admin Dashboard')

@section('content')


    <div class="row">
        <div class="col-md-2">
            <div class="box box-default">
                <div class="box-title bg-primary">
                    <h3>{{Carbon\Carbon::now()->format('F j, Y')}}</h3>
                </div>
                <div class="box-content">
                    <ul class="nav nav-pills nav-stacked">
                        <li>
                            <a href="{{url('/')}}"><i class="fa fa-home"></i> Home</a>
                        </li>
                        <li class="divider"></li>
                        <li>
                            <a href="{{action('DocumentController@index')}}"><i class="fa fa-paperclip"></i> Documents</a>
                        </li>
                        <li>
                            {{--  <a href="/historical-invoice-data"><i class="fa fa-dollar"></i> Paystubs</a>  --}}
                            <a href="/payroll"><i class="fa fa-dollar"></i> Paystubs</a>
                        </li>
                        <li>
                            <a href="/agents"><i class="fa fa-users"></i> Agents</a>
                        </li>
                        <li>
                            <a href="/upload-invoice"><i class="fa fa-table"></i> Invoices</a>
                        </li>
                        <li class="divider"></li>
                        <li>
                            <a href="{{url('/overrides')}}"><i class="fa fa-cog"></i> Overrides</a>
                        </li>
                        <li>
                            <a href="{{url('/dashboards/payroll-info')}}" data-toggle="tooltip" title="Track who we have paid by issue date.">
                                <i class="fa fa-calculator"></i> Payroll Tracking
                            </a>
                        </li>
                        <li>
                            <a href="{{url('/vendors')}}">
                                <i class="fa fa-building"></i> Campaigns
                            </a>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
        <div class="col-md-10">
            <div class="box box-default">
                <div class="box-title bg-primary">
                    <h2>My Dashboard <i class="fa fa-dashboard"></i></h2>
                </div>
                <div class="box-content">
                    <div id="vue-app"></div>
                </div>
            </div>
        </div>
    </div>


@endsection


@section('scripts')
    // this need to bring in VueJS router and pages...

@endsection