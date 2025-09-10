@extends('layouts.app')

@section('content')
<div class="row pt-100">
    <div class="col-md-6 col-md-offset-3">
        <div class="box box-default">
            <div class="box-title bg-primary">
                <h3 class="m-0"><i class="fa fa-sign-in"></i> Login</h3>
            </div>
            <div class="box-content">
                <form class="form-horizontal" role="form" method="POST" action="{{ url('/login') }}" ngNoForm>
                    {{ csrf_field() }}

                    @if (app()->environment('production'))
                        <div class="form-group{{ $errors->has('email') ? ' has-error' : '' }}">
                            <label for="email" class="col-md-4 control-label">E-Mail Address</label>

                            <div class="col-md-6">
                                <input id="email" type="email" class="form-control" name="email" value="{{ old('email') }}">

                                @if ($errors->has('email'))
                                    <span class="help-block">
                                        <strong>{{ $errors->first('email') }}</strong>
                                    </span>
                                @endif
                            </div>
                        </div>

                        <div class="form-group{{ $errors->has('password') ? ' has-error' : '' }}">
                            <label for="password" class="col-md-4 control-label">Password</label>

                            <div class="col-md-6">
                                <input id="password" type="password" class="form-control" name="password">

                                @if ($errors->has('password'))
                                    <span class="help-block">
                                        <strong>{{ $errors->first('password') }}</strong>
                                    </span>
                                @endif
                            </div>
                        </div>
                    @endif

                    @if (app()->environment('local'))

                        <div class="form-group">
                            <label for="email" class="col-md-4 control-label">Email Address</label>

                            <div class="col-md-6">
                                <select id="email" class="form-control" name="email">
                                    @foreach ($users as $user)
                                        <option value="{{$user->email}}">
                                            @if ($user->employee['is_mgr'])
                                                {{$user->name}} (Manager)
                                            @elseif ($user->employee['is_admin'])
                                                {{$user->name}} (Admin)
                                            @else
                                                {{$user->name}}
                                            @endif
                                        </option>
                                    @endforeach
                                </select>
                            </div>
                        </div>

                    @endif

                    <div class="form-group">
                        <div class="col-md-6 col-md-offset-4">
                            <div class="checkbox">
                                <label>
                                    <input type="checkbox" name="remember"> Remember Me
                                </label>
                            </div>
                        </div>
                    </div>

                    <div class="form-group">
                        <div class="col-md-6 col-md-offset-4">
                            <button type="submit" class="btn btn-primary">
                                <i class="fa fa-btn fa-sign-in"></i> Login
                            </button>
                        </div>
                    </div>

                    <div class="form-group">
                        <div class="col-md-7 col-md-offset-3">
                            <a class="btn btn-link display-inline" href="{{url('/password/reset')}}">Help Signing In</a> |
                            <a class="btn btn-link display-inline" href="{{url('/password/reset')}}">First-time Users</a>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    </div>
</div>
@endsection
