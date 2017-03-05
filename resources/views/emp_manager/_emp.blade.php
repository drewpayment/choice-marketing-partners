@foreach($employees as $emp)
    <tr data-token="true" data-value="{{ csrf_token() }}" data-parent="true" data-parentid="{{$emp->id}}" data-form="true">
        <td>
            <a href="#" class="icon-link" data-tag="2" data-value="{{$emp->id}}">
                <i class="icon ion-edit"></i>
            </a>
        </td>
        <td>
            <div class="form-group">
                {{$emp->name}}
            </div>
        </td>
        <td>
            <div class="form-group">
                {{$emp->email}}
            </div>
        </td>
        <td>
            <div class="form-group">
                {{$emp->phone_no}}
            </div>
        </td>
        <td>
            <div class="form-group text-center">
                <input type="checkbox" @if($emp->is_active == 1) checked @endif disabled>
            </div>
        </td>
        <td>
            <div class="form-group editable">
                <input class="text-center input-transparent" type="text" data-vero="text" data-tag="9" value="{{$emp->sales_id1}}"/>
            </div>
        </td>
        <td>
            <div class="form-group editable">
                <input class="text-center input-transparent" type="text" data-vero="text" data-tag="10" value="{{$emp->sales_id2}}"/>
            </div>
        </td>
        <td>
            <div class="form-group editable">
                <input class="text-center input-transparent" type="text" data-vero="text" data-tag="11" value="{{$emp->sales_id3}}"/>
            </div>
        </td>
    </tr>
@endforeach