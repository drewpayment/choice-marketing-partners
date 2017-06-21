@extends('layouts.app')

@section('content')


    <div class="row">
        <div class="col-xs-10 col-xs-offset-1">
            <div class="row">
                <div class="col-xs-10 col-xs-offset-1">
                    <div class="box box-default">
                        <div class="box-title">
                            <h2>Overrides</h2>
                        </div>
                        <div class="box-content">
                            <h4>Manage employee overrides. Pick a manager below and manage agents that roll to them.</h4>
                            If someone is missing from this list, you will need to contact your web administrator to have someone added. By selecting a manager, you are responsible for any changes that will impact the individuals that they're able to access and manage via the online portal. Please take care when making changes! These changes cannot be reversed!
                        </div>
                    </div>
                    <div class="row">
                        <div class="col-xs-10 col-xs-offset-1">
                            <div class="box box-default">
                                <div class="box-title">
                                    <h4>Managers</h4>
                                </div>
                                <div class="box-content">
                                    <ul class="list-group">
                                        @foreach($managers as $m)
                                            <li class="list-group-item">
                                                <a href="{{url('/overrides/detail', ['id' => $m->id])}}" class="list-group-item" data-parentid="{{$m->id}}">
                                                    <div class="row">
                                                        <div class="col-xs-1">
                                                            <i class="fa fa-user fa-2x fa-fw"></i>
                                                        </div>
                                                        <div class="col-xs-11">
                                                            <h4 class="list-group-item-heading">{{$m->name}}</h4>
                                                            <p class="list-group-item-text">
                                                                email: {{$m->email}}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </a>
                                            </li>
                                        @endforeach
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>


@endsection
