{{--  params available  --}}
{{--    paystubs        --}}
{{--    agents          --}}
{{--    vendors         --}}
{{--    isAdmin         --}}
{{--    isManager       --}}

@php

function returnTotals($id, $rows, $overrides, $expenses, $vendor)
{
    $rowTotal = 0;
    $ovrTotal = 0;
    $expTotal = 0;
    $sales = $rows->filter(function($item) use ($vendor){
        return $item->vendor == $vendor;
    })->filter(function($item) use ($id){
        return $item->agentid == $id;
    })->pluck('amount');

    $overs = $overrides->filter(function($item) use ($vendor){
        return $item->vendor_id == $vendor;
    })->filter(function($item) use ($id){
        return $item->agentid == $id;
    })->pluck('total');

    $exps = $expenses->filter(function($item) use ($vendor){
        return $item->vendor_id == $vendor;
    })->filter(function($item) use ($id){
        return $item->agentid == $id;
    })->pluck('amount');

    foreach($sales as $s)
    {
        if(is_numeric($s)) $rowTotal = $rowTotal + $s;
    }

    foreach($overs as $o)
    {
        if(is_numeric($o)) $ovrTotal = $ovrTotal + $o;
    }

    foreach($exps as $e)
    {
        if(is_numeric($e)) $expTotal = $expTotal + $e;
    }

    $total = $rowTotal + $ovrTotal + $expTotal;

    return $total;
}

@endphp


@if(count($paystubs) > 0)
    @foreach($paystubs as $p)
        <tr class="cursor-clickable" data-stub="true" data-vid="{{$p['vendor']}}" data-aid="{{$p['agentid']}}">
            <td>
                {{$agents->first(function($v, $k)use($p){return $v['id'] == $p['agentid'];})['name']}}
                <form method="post" id="form" action="/paystubs/pdf-detail">
                    <input type="hidden" name="_token" value="{{csrf_token()}}">
                    <input type="hidden" name="date" id="date">
                    <input type="hidden" name="vendor" id="vendor">
                    <input type="hidden" name="agent" id="agent">
                </form>
            </td>
            <td>
                {{$vendorDictionary->first(function($v, $k)use($p){return $v->id == (int)$p->vendor;})->name}}
            </td>
            <td>
                ${{returnTotals($p->agentid, $rows, $overrides, $expenses, (int)$p->vendor)}}
            </td>
        </tr>
    @endforeach
@else
    <tr>
        <td colspan="3" class="text-center"><h3><i class="fa fa-frown-o"></i> No Results Found</h3></td>
    </tr>
@endif