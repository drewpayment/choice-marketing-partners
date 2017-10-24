@extends('blog.layout')

@section('blog_title')
    {{$title}}
@endsection

@section('blog-content')

    <form action="/new-post" method="POST">
        <input type="hidden" name="_token" value="{{csrf_token()}}">
        <div class="form-group">
            <input value="{{old('title')}}" placeholder="Enter title here" type="text" name="title" class="form-control" required />
        </div>
        <div class="form-group">
            <textarea name="body" class="form-control">{{old('body')}}</textarea>
        </div>
        <input type="submit" name="publish" class="btn btn-success" value="Publish" />
        <input type="submit" name="save" class="btn btn-default" value="Save Draft" />
    </form>

@endsection

@section('scripts')

    <script src="/js/tinymce.min.js"></script>
    <script type="text/javascript">
        tinymce.init({
            selector: 'textarea',
            plugins: [
                'advlist autolink lists link image charmap print preview anchor',
                'searchreplace visualblocks code fullscreen',
                'insertdatetime media table contextmenu paste'
            ],
            toolbar: 'insertfile undo redo | stylesheet | bold italic | alignleft alignright alignjustify | bullist numlist outdent indent | link image'
        });
    </script>

@endsection