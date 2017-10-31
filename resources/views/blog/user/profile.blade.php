@extends('layouts.app', ['containerClass' => 'container-fluid'])

@section('title')
    {{$user->name}}
@endsection

@section('content')

    <div class="row">
        <div class="col-md-12">
            <div class="box box-default">
                <div class="box-title bg-primary">
                    <h3 class="m-0"><i class="fa fa-user"></i> {{$user->name}}</h3>
                </div>
                <div class="box-content">
                    <div class="row">
                        <div class="col-md-2">
                            <div class="box box-default">
                                <div class="box-content">
                                    <ul class="nav nav-pills nav-stacked">
                                        <li>
                                            <a href="{{url('/blog')}}"><i class="fa fa-home"></i> Home</a>
                                        </li>
                                        <li class="divider"></li>
                                        <li>
                                            <a href="{{url('/blog/user/'.Auth::user()->id)}}"><i class="fa fa-user"></i> Profile</a>
                                        </li>
                                        <li>
                                            <a href="{{url('/blog/new-post')}}"><i class="fa fa-pencil"></i> Compose</a>
                                        </li>
                                        <li>
                                            <a href="{{url('/blog/my-all-posts')}}"><i class="fa fa-th-list"></i> My Posts</a>
                                        </li>
                                        <li>
                                            <a href="{{url('/blog/my-drafts')}}"><i class="fa fa-clipboard"></i> My Drafts</a>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-9">
                            <div class="box box-default">
                                <div class="box-content">
                                    <ul class="list-group">
                                        <li class="list-group-item">
                                            Joined on {{$user->created_at->format('M d,Y g:i a')}}
                                        </li>
                                        <li class="list-group-item panel-body">
                                            <table class="table-padding">
                                                <style>
                                                    .table-padding td{
                                                        padding: 3px 8px;
                                                    }
                                                </style>
                                                <tr>
                                                    <td>Total Posts</td>
                                                    <td>{{$posts_count}}</td>
                                                    @if($author && $posts_count)
                                                        <td>
                                                            <a href="{{url('/blog/my-all-posts')}}">Show All</a>
                                                        </td>
                                                    @endif
                                                </tr>
                                                <tr>
                                                    <td>Published Posts</td>
                                                    <td>{{$posts_active_count}}</td>
                                                    @if($posts_active_count)
                                                        <td>
                                                            <a href="{{url('/blog/user/'.$user->id.'/posts')}}">Show All</a>
                                                        </td>
                                                    @endif
                                                </tr>
                                                <tr>
                                                    <td>Posts in Draft</td>
                                                    <td>{{$posts_draft_count}}</td>
                                                    @if($author && $posts_draft_count)
                                                        <td>
                                                            <a href="{{url('/blog/my-drafts')}}">Show All</a>
                                                        </td>
                                                    @endif
                                                </tr>
                                            </table>
                                        </li>
                                        <li class="list-group-item">
                                            Total Comments &nbsp;&nbsp;&nbsp;{{$comments_count}}
                                        </li>
                                    </ul>
                                    <div class="box box-default">
                                        <div class="box-title">
                                            <h3>Latest Posts</h3>
                                        </div>
                                        <div class="box-content">
                                            @if(!empty($latest_posts[0]))
                                                @foreach($latest_posts as $latest)
                                                    <p>
                                                        <strong><a href="{{url('/blog/'.$latest->slug)}}">{{$latest->title}}</a></strong>
                                                        <span class="well-sm">On {{$latest->created_at->format('M d, Y g:i a')}}</span>
                                                    </p>
                                                @endforeach
                                            @else
                                                <p>You have not written any posts yet.</p>
                                            @endif
                                        </div>
                                    </div>
                                    <div class="box box-default">
                                        <div class="box-title">
                                            <h3>Latest Comments</h3>
                                        </div>
                                        <div class="box-content">
                                            @if(!empty($latest_comments[0]))
                                                @foreach($latest_comments as $latest)
                                                    <div class="box box-default">
                                                        <div class="box-content">
                                                            <p>{{$latest->body}}</p>
                                                            <hr/>
                                                            <p>On {{$latest->created_at->format('M d, Y g:i a')}}</p>
                                                            <p>From post <a href="{{url('/blog/'.$latest->post->slug)}}">{{$latest->post->title}}</a></p>
                                                        </div>
                                                    </div>
                                                @endforeach
                                            @else
                                                <p>You have not commented on any posts yet. Get started <a href="{{url('/blog')}}">now!</a></p>
                                            @endif
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

@endsection