{{--  params available  --}}
{{--    paystubs        --}}
{{--    agents          --}}
{{--    vendors         --}}
{{--    isAdmin         --}}
{{--    isManager       --}}


@if(count($paystubs) > 0)
    @foreach($paystubs as $p)
        <tr class="cursor-clickable" data-stub="true" data-vid="{{$p['vendor_id']}}" data-aid="{{$p['agent_id']}}">
            <td>
                {{$p['agent_name']}}
                <form method="post" id="form" action="/paystubs/pdf-detail">
                    <input type="hidden" name="_token" value="{{csrf_token()}}">
                    <input type="hidden" name="date" id="date">
                    <input type="hidden" name="vendor" id="vendor">
                    <input type="hidden" name="agent" id="agent">
                </form>
            </td>
            <td>
                {{$p['vendor_name']}}
            </td>
            <td>
                ${{$p['amount']}}
            </td>
        </tr>
    @endforeach
@else
    <tr>
        <td colspan="3" class="text-center"><h3><i class="fa fa-frown-o"></i> No Results Found</h3></td>
    </tr>
@endif