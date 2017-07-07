

@foreach($vendors as $v)
    @php
        $checked = ($v->is_active == 1) ? "checked" : "";
    @endphp
    <li class="list-group-item">
        <div class="row">
            <div class="col-xs-1">
                <i class="fa fa-building fa-2x fa-fw"></i>
            </div>
            <div class="col-xs-11">
                <h4>{{$v->name}} <small class="pull-right"><label>Active <input type="checkbox" {{$checked}}></label></small></h4>
            </div>
        </div>
    </li>
@endforeach