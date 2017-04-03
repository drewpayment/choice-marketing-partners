
@foreach($invoices as $invoice)

    <tr>
        <td>
            <a href="/invoices/show-invoice/{{$invoice['agentID']}}/{{$invoice['vendorID']}}/{{$invoice['issueDate']}}">{{$invoice['agentName']}}</a>
        </td>
        <td>
            {{$invoice['issueDate']}}
        </td>
        <td>
            {{$invoice['vendorName']}}
        </td>
    </tr>

@endforeach