
@foreach($posts as $post)
    <div class="box box-default">
        <div class="box-title">
            <h3 class="m-0">
                <a href="{{url('blog/'.$post->slug)}}">{{$post->title}}</a>
                @if(!Auth::guest() && ($post->author_id == Auth::user()->id || Auth::user()->is_admin()))
                    @if($post->active == 1)
                        <a href="#" data-href="{{url('blog/delete/'.$post->id)}}" class="btn btn-danger btn-sm pull-right delete-btn"><i class="fa fa-trash"></i></a>
                        <a href="{{url('blog/edit/'.$post->slug)}}" class="btn btn-default btn-sm pull-right mr-5"><i class="fa fa-edit"></i> Edit Post</a>
                    @else
                        <a href="blog/edit/{{$post->slug}}" class="btn btn-default btn-sm pull-right"><i class="fa fa-edit"></i> Edit Draft</a>
                    @endif
                @endif
            </h3>
            <p>
                {{$post->created_at->format("M d, Y")}} By <a href="{{url("blog/user/".$post->author_id)}}">{{$post->author->name}}</a>
            </p>
        </div>
        <div class="box-content">
            <article>
                {!! str_limit($post->body, $limit = 500, $end = "...<a href=".url('blog/'.$post->slug).">[Read More]</a>") !!}
            </article>
        </div>
    </div>
@endforeach
{!! $posts->render() !!}

@section('scripts')

    <script type="text/javascript">
        $(document).on('click', '.delete-btn', function(){
            if(confirm('Are you sure you would like to delete the post? This action cannot be undone.'))
                window.location.href = $(this).data('href');
        });
    </script>

@endsection