@foreach($employees as $e)
    <tr data-parent="true" data-parentid="{{$e->id}}">
        <td>
            <a href="#" data-id="edit-agent">{{$e->name}}</a>
        </td>
        <td>{{$e->email}}</td>
        <td>{{$e->phone_no}}</td>
        <td>
            <input type="checkbox" <?php echo ($e->is_active) ? 'checked' : ''; ?> />
        </td>
    </tr>
@endforeach