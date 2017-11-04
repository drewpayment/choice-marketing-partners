@extends('blog.layout', ['container' => 'container-fluid'])

@section('blog_title')
    {!! $title !!}
@endsection

@section('blog-content')

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
            <div class="box box-default">
                <div class="box-content">
                    @if(!$posts->count())
                        There are no posts yet. Write one now!
                    @else
                        @include('blog.feed', ['posts' => $posts])
                    @endif
                </div>
            </div>
        </div>
    </div>

@endsection