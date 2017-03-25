

@foreach($employees as $e)

    <tr class="bg-white {{($e->is_paid == 1) ? "success" : ""}}" data-parent="true" data-parentid="{{$e->id}}">
        <td>{{$e->agent_name}}</td>
        <td>${{$e->amount}}</td>
        <td>
            <input type="checkbox" id="paid-confirm" value="{{$e->is_paid}}" {{($e->is_paid == 1) ? "checked" : ""}}/>
        </td>
    </tr>

@endforeach