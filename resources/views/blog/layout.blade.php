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
                    <h3 class="m-0">@yield('blog_title')</h3>
                </div>
                @if(!$useWrapper)
                    <div class="box-content">
                        @yield('title-meta')
                        @yield('blog-content')
                    </div>
                @else
                    <div class="box-content">
                        <div class="row">
                            @if(Auth::check())
                                <div class="col-md-2">
                                    <div class="box box-default">
                                        <div class="box-content">
                                            <ul class="nav nav-pills nav-stacked">
                                                <li>
                                                    <a href="{{url('/blog')}}"><i class="fa fa-home"></i> All Posts</a>
                                                </li>
                                                <li class="divider"></li>
                                                <li>
                                                    <a href="{{url('/blog/user/'.Auth::user()->id)}}"><i class="fa fa-user"></i> Profile</a>
                                                </li>
                                                <li>
                                                    <a href="{{url('/blog/new-post')}}"><i class="fa fa-pencil"></i> Compose</a>
                                                </li>
                                                <li>
                                                    <a href="{{route('my-all-posts')}}"><i class="fa fa-th-list"></i> My Posts</a>
                                                </li>
                                                <li>
                                                    <a href="{{url('/blog/my-drafts')}}"><i class="fa fa-clipboard"></i> My Drafts</a>
                                                </li>
                                                @if(Auth::check() && Auth::user()->is_admin())
                                                    <li>
                                                        <a href="{{url('/blog/comment-approvals')}}"><i class="fa fa-thumbs-o-up"></i> Approve Comments</a>
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
                                @yield('blog-content')
                            </div>
                        </div>
                    </div>

                @endif
            </div>
        </div>
    </div>

@endsection