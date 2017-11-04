@extends('blog.layout', ['container' => 'container-fluid', 'useWrapper' => true])

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

    <form action="{{url('/blog/new-post')}}" method="POST">
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

@endsection