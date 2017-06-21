

@foreach($children as $c)
    <tr data-parent="true" data-parentid="{{$c->id}}">
        <td class="text-center">
            <ul class="list-inline list-unstyled">
                <li class="cursor-clickable" id="delete-override">
                    <i class="fa fa-trash fa-fw"></i>
                </li>
            </ul>
        </td>
        <td>
            {{$c->name}}
        </td>
    </tr>
@endforeach