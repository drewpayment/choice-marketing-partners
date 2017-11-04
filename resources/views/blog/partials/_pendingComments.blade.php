
@foreach($comments as $c)

    <div class="box box-default">
        <div class="box-title bg-primary">
            <p class="display-inline">Post by: {{$c->author->name}}</p>
            <div class="display-inline pull-right" data-parent="true" data-id="{{$c->id}}">
                <h3 class="display-inline">
                    <button class="btn btn-default btn-sm" id="comment-approve">
                        <i class="fa fa-thumbs-o-up"></i> Approve
                    </button>
                </h3>
                <span class="p-5"></span>
                <h3 class="display-inline">
                    <button class="btn btn-default btn-sm" id="comment-decline">
                        <i class="fa fa-thumbs-o-down"></i> Decline
                    </button>
                </h3>
            </div>
        </div>
        <div class="box-content">
            <p>Posted: {{$c->created_at->format('M d, Y g:ia')}}</p>
            <h4 class="b-b">Post Text:</h4>
            <p>{{$c->body}}</p>
        </div>
    </div>

@endforeach

@if(count($comments) == 0)

    <h3>Looks like you're good for now! Nothing to approve.</h3>

@endif