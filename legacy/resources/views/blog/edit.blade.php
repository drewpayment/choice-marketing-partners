@extends('blog.layout', ['container' => 'container-fluid'])

@section('blog_title')
    {{$title}}
@endsection

@section('blog-content')
    <script src="/js/tinymce/tinymce.min.js"></script>
    <script type="text/javascript">
        tinymce.init({
            selector : "textarea",
            height: 400,
            plugins : ["advlist autolink lists link image charmap print preview anchor", "searchreplace visualblocks code fullscreen", "insertdatetime media table contextmenu paste"],
            toolbar : "insertfile undo redo | styleselect | bold italic | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | link image",
        });
    </script>

    <div class="row">
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
                            <a href="{{url('/blog/my-all-posts')}}"><i class="fa fa-th-list"></i> My Posts</a>
                        </li>
                        <li>
                            <a href="{{url('/blog/my-drafts')}}"><i class="fa fa-clipboard"></i> My Drafts</a>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
        <div class="col-md-10">
            <div class="box box-default">
                <div class="box-content">
                    <form method="POST" action="{{url('/blog/update')}}">
                        <input type="hidden" name="_token" value="{{csrf_token()}}" />
                        <input type="hidden" name="post_id" value="{{$post->id}}{{old('post_id')}}" />
                        <div class="form-group">
                            <input placeholder="Enter title here" type="text" name="title" class="form-control" value="@if(!old('title')){{$post->title}}@endif{{old('title')}}" />
                        </div>
                        <div class="form-group">
                            <textarea name="body" class="form-control">
                                @if(!old('body'))
                                    {!! $post->body !!}
                                @endif
                                {!! old('body') !!}
                            </textarea>
                        </div>
                        @if($post->active == '1')
                            <input type="submit" name="publish" class="btn btn-success" value="Update" />
                        @else
                            <input type="submit" name="publish" class="btn btn-success" value="Publish" />
                        @endif
                        <input type="submit" name="save" class="btn btn-default" value="Save Draft" />
                        <a href="{{url('blog/delete/'.$post->id.'?_token='.csrf_token())}}" class="btn btn-danger">Delete</a>
                    </form>
                </div>
            </div>
        </div>
    </div>

@endsection