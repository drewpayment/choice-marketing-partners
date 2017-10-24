@extends('layouts.app')

@section('content')

    <div class="row">
        <div class="col-md-12">
            <div class="panel panel-default">
                <div class="panel-heading">
                    <h2>@yield('blog_title')</h2>
                    @yield('title-meta')
                </div>
                <div class="panel-body">
                    @yield('blog-content')
                </div>
            </div>
        </div>
    </div>

@endsection