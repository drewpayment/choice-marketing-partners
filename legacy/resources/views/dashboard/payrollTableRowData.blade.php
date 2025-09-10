
@if(count($employees) > 0)
    @foreach($employees as $e)

        <tr class="bg-white {{($e->is_paid == 1) ? "success" : ""}}" data-parent="true" data-parentid="{{$e->id}}">
            <td>{{$e->agent_name}}</td>
            <td>${{$e->amount}}</td>
            <td>{{$vendors->first(function($v, $k)use($e){return $v->id == $e->vendor_id;})->name}}</td>
            <td>
                <input type="checkbox" id="paid-confirm" value="{{$e->is_paid}}" {{($e->is_paid == 1) ? "checked" : ""}}/>
            </td>
        </tr>

    @endforeach
@else
    <tr>
        <td colspan="3">
            <h2 class="wp-100 text-center">
                <i class="fa fa-frown-o"></i> No Results Found
            </h2>
        </td>
    </tr>
@endif