
<!-- MODAL -->

<div class="modal-dialog" role="document">
    <div class="modal-content">
        <div class="modal-header">
            <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
            <h3 class="modal-title" id="modal-title">{{$title}} Weekly Comma Club</h3>
        </div>
        <div class="modal-body">
            <p>Want to join the ranks of these professionals? Click Apply Now and send us a message today.</p>
            <ul class="list-unstyled maxh-470 overflow-scroll">
                @foreach($agents as $a)
                    <li>
                        <img src="{{$a[1]}}" class="commaClubImg" data-rotate="{{(!array_key_exists(2, $a)) ? 0 : $a[2]}}" onerror="commaImageError(this)" />
                        <h4>{{$a[0]}}</h4>
                    </li>
                    {{--<li><h4>{{$a[0]}} <small>img: {{$a[1]}}</small></h4></li>--}}
                @endforeach
            </ul>
        </div>
        <div class="modal-footer">
            <button type="button" class="btn btn-default" data-dismiss="modal">Close</button>
        </div>
    </div><!-- /.modal-content -->
</div><!-- /.modal-dialog -->