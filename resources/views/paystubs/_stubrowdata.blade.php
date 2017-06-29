
@if(count($paystubs) > 0)
    @foreach($paystubs as $p)
        <tr class="cursor-clickable" data-stub="true" data-vid="{{$p->vendor}}" data-aid="{{$p->agentid}}">
            <td>{{$agents->first(function($v, $k)use($p){return $v->id == $p->agentid;})->name}}</td>
            <td>{{$vendors->first(function($v, $k)use($p){return $v->id = (int)$p->vendor;})->name}}</td>
            <td>${{money_format('%.2n', $paystubs->sum(function($s)use($p){ if($s->agentid == $p->agentid){ return $s->amount;}else{return null;} }))}}</td>
        </tr>
    @endforeach
@else
    <tr>
        <td colspan="3" class="text-center"><h3><i class="fa fa-frown-o"></i> No Results Found</h3></td>
    </tr>
@endif
