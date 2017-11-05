@extends('blog.layout', ['pageTitle' => $post->title])

@section('blog_title')
    @if($post)
        {{$post->title}}
        @if(!Auth::guest() && ($post->author_id == Auth::user()->id || Auth::user()->is_admin()))
            <a href="{{url('blog/edit/'.$post->slug)}}" class="btn pull-right color-white">Edit Post</a>
        @endif
    @else
        Page does not exist
    @endif
@endsection

@section('title-meta')
    <div class="box-content-title">
        <p>
            {{$post->created_at->format('M d, Y')}} By <a href="{{url('blog/user/'.$post->author_id)}}">{{$post->author->name}}</a>
        </p>
    </div>
@endsection

@section("blog-content")

    @if($post)
        <div class="p-10 b-b pb-20">
            {!! $post->body !!}
        </div>
        @if(Auth::check() && auth()->user()->is_admin() && $pending_comments > 0)
            <?php $howManyComments = ($pending_comments > 1) ? "comments" : "comment"; ?>
            <div class="p-10 b-b">
                <h4>Admin Todos:</h4>
                <p>
                    This post has <a href="{{url('blog/comment-approvals')}}">{{$pending_comments}}</a> pending {{$howManyComments}}.
                </p>
            </div>
        @endif
        <div>
            <h4>Leave a Comment</h4>
        </div>
        @if(Auth::guest())
            <p><a href="{{url('/login')}}">Login</a> to leave a comment</p>
        @else
            <div class="panel-body">
                <form method="POST" action="{{url('blog/comment/add')}}">
                    <input type="hidden" name="_token" value="{{csrf_token()}}" />
                    <input type="hidden" name="on_post" value="{{$post->id}}" />
                    <input type="hidden" name="slug" value="{{$post->slug}}" />
                    <div class="form-group">
                        <textarea placeholder="Enter comment here" name="body" class="form-control" required></textarea>
                    </div>
                    <input type="submit" name="post_comment" class="btn btn-success" value="Post" />
                </form>
            </div>
        @endif
        <div>
            @if($comments)
                <ul class="list-unstyled">
                    @foreach($comments as $comment)
                        <li class="panel-body">
                            <div class="list-group">
                                <div class="list-group-item p-0 pl-10">
                                    <h4>{{$comment->author->name}}
                                        <small>{{$comment->created_at->format('M d, Y g:i:sa')}}</small>
                                        @if(Auth::check() && (Auth::user()->id == $post->author_id || Auth::user()->employee->is_admin == 1))
                                            <a href="#" data-href="{{url('/blog/comment/delete/'.$comment->id)}}" id="delete-btn" class="btn btn-danger btn-xs pull-right mr-5"><i class="fa fa-trash"></i></a>
                                        @endif
                                    </h4>
                                </div>
                                <div class="list-group-item">
                                    <p>{{$comment->body}}</p>
                                </div>
                            </div>
                        </li>
                    @endforeach
                </ul>
            @endif
        </div>
    @else
        404 error
    @endif

@endsection

@section('scripts')

    <script type="text/javascript">
        $(document).on('click', '#delete-btn', function(){
            if(confirm('Are you sure you want to delete this comment?'))
                window.location.href = $(this).data('href');
        });
    </script>

@endsection