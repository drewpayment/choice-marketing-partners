<?php
$container = isset($container) ? $container : 'container';
$pageTitle = isset($pageTitle) ? $pageTitle.' - Choice Marketing' : 'Choice Marketing Partners';
$useWrapper = isset($useWrapper) ? (boolean)$useWrapper : false;
?>

@extends('layouts.app', ['containerClass' => $container])

@section('title', $pageTitle)

@section('content')

    <div class="row">
        <div class="col-md-12">
            <div class="box box-default">
                <div class="box-title bg-primary">
                    <h3 class="m-0">@yield('wrapper-title')</h3>
                </div>
                @if(!$useWrapper)
                    <div class="box-content">
                        @yield('wrapper-content')
                    </div>
                @else
                    <div class="box-content">
                        <div class="row">
                            @if(Auth::check())
                                <div class="col-md-2">
                                    <div class="box box-default">
                                        <div class="box-content">
                                            <ul class="nav nav-pills nav-stacked">
						@if(session('authenticatedUserIsAdmin'))
                                                <li>
                                                    <a href="{{url('/dashboards/settings')}}"><i class="fa fa-cogs"></i> Settings</a>
                                                </li>
                                                <li>
                                                    <a href="{{url('/agents')}}"><i class="fa fa-users"></i> Agents</a>
                                                </li>
                                                <li>
                                                    <a href="{{url('/dashboards/release-restriction')}}"><i class="fa fa-clock-o"></i> Paystub Restriction</a>
                                                </li>
                                                <li>
                                                    <a href="{{url('/dashboards/payroll-info')}}"><i class="fa fa-credit-card"></i> Payroll Tracking</a>
                                                </li>
						@endif
                                                <li>
                                                    <a href="{{url('/documents')}}"><i class="fa fa-paperclip"></i> Document Manager</a>
                                                </li>
						@if(session('authenticatedUserIsAdmin'))
                                                <li>
                                                    <a href="{{url('/overrides')}}"><i class="fa fa-cog"></i> Overrides</a>
                                                </li>
                                                <li>
                                                    <a href="{{url('/vendors')}}"><i class="fa fa-building"></i> Campaigns</a>
                                                </li>
						@endif
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            @else
                                <div class="col-md-2">
                                    <div class="box box-default">
                                        <div class="box-content">
                                            <a href="{{url('/login')}}" class="btn btn-link">Login to access all features</a>
                                        </div>
                                    </div>
                                </div>
                            @endif
                            <div class="col-md-10">
                                @yield('wrapper-content')
                            </div>
                        </div>
                    </div>

                @endif
            </div>
        </div>
    </div>

@endsection
