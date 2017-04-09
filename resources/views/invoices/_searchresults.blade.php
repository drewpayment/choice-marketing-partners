
@foreach($invoices as $invoice)

    <tr>
        <td>
            <a href="/invoices/show-invoice/{{$invoice['agentID']}}/{{$invoice['vendorID']}}/{{$invoice['issueDate']}}">{{$invoice['agentName']}}</a>
        </td>
        <td>
            {{date_format(date_create($invoice['issueDate']), 'm-d-Y')}}
        </td>
        <td>
            {{$invoice['vendorName']}}
        </td>
    </tr>

@endforeach