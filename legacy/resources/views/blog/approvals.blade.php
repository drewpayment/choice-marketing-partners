@extends('blog.layout', ['container' => 'container-fluid', 'useWrapper' => true])

@section('blog_title')
    {!! $title !!}
@endsection

@section('blog-content')

    <div class="box box-default">
        <div class="box-content">
            <div class="box-content-title">
                <h3 class="text-center">Pending Comments</h3>
                <p class="b-b">
                    The following comments have been submitted but are still waiting to be approved before they will be viewable publicly. Please use discretion when approving.
                </p>
            </div>

            <div id="comment-content">
                @include('blog.partials._pendingComments', ['comments' => $comments])
            </div>
        </div>
    </div>

@endsection