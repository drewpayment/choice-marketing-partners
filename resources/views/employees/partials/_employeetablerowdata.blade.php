@foreach($employees as $e)
    <tr data-parent="true" data-parentid="{{$e->id}}">
        <td>
            <a href="#" data-action="edit-agent">{{$e->name}}</a>
        </td>
        <td>{{$e->email}}</td>
        <td>{{$e->phone_no}}</td>
        <td class="text-center">
            <input type="checkbox" <?php echo ($e->is_active) ? 'checked' : ''; ?> />
        </td>
        <td class="text-right">{{$e->created_at}}</td>
        <td class="text-right">{{$e->updated_at}}</td>
    </tr>
@endforeach