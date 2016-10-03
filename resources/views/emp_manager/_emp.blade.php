@foreach($employees as $emp)
    <tr>
        <td>
            <div class="form-group">
                <input type="text" class="form-control" placeholder="Employee Name" id="empName" name="empName" value="{{$emp->name}}">
            </div>
        </td>
        <td>
            <div class="form-group">
                <input type="email" class="form-control" placeholder="Email" id="empEmail" name="empEmail" value="{{$emp->email}}">
            </div>
        </td>
        <td>
            <div class="form-group">
                <input type="number" class="form-control" placeholder="Phone Number" id="empPhone" name="empPhone" value="{{$emp->phone_no}}">
            </div>
        </td>
        <td>
            <div class="form-group">
                <input type="checkbox" class="form-control" title="Active" id="empActive" name="empActive" @if($emp->is_active == 1) checked @endif>
            </div>
        </td>
        <td>
            <div class="form-group">
                <input type="text" class="form-control" placeholder="Address" id="empAddress" name="empAddress" value="{{$emp->address}}">
            </div>
        </td>
    </tr>
@endforeach