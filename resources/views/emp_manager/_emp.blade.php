@foreach($employees as $emp)
    <tr data-token="true" data-value="{{ csrf_token() }}">
        <td>
            <a href="#" id="editEmployeeBtn" class="icon-link" onclick="editEmployee(this)" data-value="{{$emp->id}}">
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
                <input type="checkbox" @if($emp->is_active == 1) checked @endif">
            </div>
        </td>
        <td>
            <div class="form-group">
                {{$emp->address}}
            </div>
        </td>
    </tr>
@endforeach