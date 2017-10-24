@extends('blog.layout')

@section('blog_title')
    {{$title}}
@endsection

@section('blog-content)

    @if(!$posts->count())
        There are no posts yet. Write one now!
    @else
        @foreach($posts as $post)
            <div class="list-group">
                <div class="list-group-item">
                    <h3>
                        <a href="{{url('/'.$post->slug)}}">{{$post->title}}</a>
                        @if(!Auth::guest() && ($post->author_id == Auth::user()->id || Auth::user()->is_admin()))
                            @if($post->active == 1)
                                <a href="'edit/{{$post->slug}}" class="btn pull-right">Edit Post</a>
                            @else
                                <a href="edit/{{$post->slug}}" class="btn pull-right">Edit Draft</a>
                            @endif
                        @endif
                    </h3>
                    <p>
                        {{$post->created_at->format('M d,Y \a\t h:i a')}} By <a href="{{url('/user/'.$post->author_id)}}">{{$post->author->name}}</a>
                    </p>
                </div>
                <div class="list-group-item">
                    <article>
                        {!! str_limit($post->body, $limit = 1500, $end = '...<a href='.url("/".$post->slug).'>[Read More]</a>') !!}
                    </article>
                </div>
            </div>
        @endforeach
        {!! $posts->render() !!}
    @endif

@endsection