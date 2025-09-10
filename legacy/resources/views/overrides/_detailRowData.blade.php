
@if(count($children) > 0)
@foreach($children as $c)
    <tr data-parent="true" data-parentid="{{$c['id']}}">
        <td class="text-center">
            <ul class="list-inline list-unstyled">
                <li>
                    <button id="delete-override" type="button" class="btn btn-danger btn-sm">
                        <i class="fa fa-trash fa-fw"></i>
                    </button>
                </li>
            </ul>
        </td>
        <td>
            <h4>{{$c['name']}}</h4>
        </td>
    </tr>
@endforeach
@if(count($children) == 0)

    <tr>
        <td colspan="2" class="text-center"><i class="fa fa-frown-o fa-2x"></i> <h3 class="display-inline">No Results</h3></td>
    </tr>

@endif
@else
    <tr>
        <td colspan="2" class="text-center"><i class="fa fa-frown-o fa-2x"></i> <h3 class="display-inline">No Results</h3></td>
    </tr>
@endif