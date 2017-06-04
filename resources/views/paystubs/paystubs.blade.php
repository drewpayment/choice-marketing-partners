

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

            <tr>
                <td>
                    {{$agents->first(function($v, $k) use ($p){
                        return $v == $p->agentid;
                    })->name}}
                </td>
                <td>
                    {{$p->vendor}}
                </td>
                <td>
                    {{--{{ echo $p->issue_date }}--}}
                </td>
            </tr>

        @endforeach
    </tbody>
</table>
