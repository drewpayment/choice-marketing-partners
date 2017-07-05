@php

function returnTotals($id, $rows, $overrides, $expenses)
{
    $rowTotal = $rows->where('agentid', $id)->sum('amount');
    $ovrTotal = $overrides->where('agentid', $id)->sum('total');
    $expTotal = $expenses->where('agentid', $id)->sum('amount');
    $total = $rowTotal + $ovrTotal + $expTotal;

    return $total;
}

@endphp


@if(count($paystubs) > 0)
    @foreach($paystubs as $p)
        <tr class="cursor-clickable" data-stub="true" data-vid="{{$p->vendor}}" data-aid="{{$p->agentid}}">
            <td>
                {{$agents->first(function($v, $k)use($p){return $v->id == $p->agentid;})->name}}
                <form method="post" id="form" action="/paystubs/pdf-detail">
                    <input type="hidden" name="_token" value="{{csrf_token()}}">
                    <input type="hidden" name="date" id="date">
                    <input type="hidden" name="vendor" id="vendor">
                    <input type="hidden" name="agent" id="agent">
                </form>
            </td>
            <td>{{$vendors->first(function($v, $k)use($p){return $v->id = (int)$p->vendor;})->name}}</td>
            <td>
                ${{returnTotals($p->agentid, $rows, $overrides, $expenses)}}
            </td>
        </tr>
    @endforeach
@else
    <tr>
        <td colspan="3" class="text-center"><h3><i class="fa fa-frown-o"></i> No Results Found</h3></td>
    </tr>
@endif