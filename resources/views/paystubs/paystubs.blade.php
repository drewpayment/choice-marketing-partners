

<table>
    <thead>
        <tr>
            <th>Employee Name</th>
            <th>Vendor</th>
            <th>Issue Date</th>
        </tr>
    </thead>
    <tbody>
        @foreach($paystubs as $p)

            <tr data-parent="true" data-parentid="{{$p->agentid}}">
                <td>
                    {{$agents->first(function($v, $k) use ($p){return $v->id == $p->agentid;})['name']}}
                </td>
                <td>
                    {{$p->vendor}}
                </td>
                <td>
                    {{$p->issue_date}}
                </td>
            </tr>

        @endforeach
    </tbody>
</table>
