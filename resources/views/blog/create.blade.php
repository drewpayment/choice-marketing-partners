@extends('blog.layout', ['container' => 'container-fluid'])

@section('blog_title', '<i class="fa fa-pencil"></i> Compose New Entry')

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
        <div class="col-md-10">
            <div class="box box-default">
                <div class="box-content">
                    <form action="/blog/new-post" method="POST">
                        <input type="hidden" name="_token" value="{{csrf_token()}}">
                        <div class="form-group">
                            <input value="{{old('title')}}" placeholder="Enter title here" type="text" name="title" class="form-control" required />
                        </div>
                        <div class="form-group">
                            <textarea name="body" id="body" style="visibility: hidden;">{{old('body')}}</textarea>
                        </div>
                        <input type="submit" name="publish" class="btn btn-success" value="Publish" />
                        <input type="submit" name="save" class="btn btn-default" value="Save Draft" />
                    </form>
                </div>
            </div>
        </div>
    </div>

@endsection