@foreach($employees as $emp)
    <tr data-token="true" data-value="{{ csrf_token() }}">
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
            <div class="form-group">
                {{$emp->address}}
            </div>
        </td>
    </tr>
@endforeach