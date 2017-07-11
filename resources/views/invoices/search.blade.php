@extends('layouts.app')

@section('title', 'Search Invoices')

@section('content')

    <div class="row">
        <div class="col-md-12">
            <ul class="list-inline list-unstyled">
                <li>
                    <label for="employeeName">Employee</label>
                    <select class="selectpicker" id="employeeName" data-live-search="true">
                        <option value="-1">Select Employee</option>
                        @foreach($employees as $e)
                            <option value="{{$e->id}}">{{$e->name}}</option>
                        @endforeach
                    </select>
                </li>
                <li>
                    <label for="invoiceDates">Date</label>
                    <select class="selectpicker" id="invoiceDates">
                        @foreach($dates as $d)
                            <option value="{{$d->issue_date}}" {{($d->issue_date == date(strtotime('next wednesday'))) ? "selected" : ""}}>{{date_format(date_create($d->issue_date), 'm-d-Y')}}</option>
                        @endforeach
                    </select>
                </li>
                <li>
                    <label for="campaignName">Campaign</label>
                    <select class="selectpicker" id="campaignName">
                        @foreach($campaigns as $c)
                            <option value="{{$c->id}}" {{($c->id == 7) ? "selected" : ""}}>{{$c->name}}</option>
                        @endforeach
                    </select>
                </li>
            </ul>
        </div>
    </div>
    <div class="row">
        <div class="col-md-12">
            <table class="table">
                <thead>
                <tr>
                    <td class="w-140">Agent Name</td>
                    <td class="w-100">Issue Date</td>
                    <td class="w-100">Campaign</td>
                </tr>
                </thead>
                <tbody id="TABLE_ROWDATA"></tbody>
            </table>
        </div>
    </div>

@endsection

@section('scripts')

    <script type="text/javascript">
        var token = '{{csrf_token()}}';

        // listen to event on employee name change
        $('#employeeName').on('change', function(){ returnInvoiceSearchResults(token); });
        $('#invoiceDates').on('change', function(){ returnInvoiceSearchResults(token); });
        $('#campaignName').on('change', function(){ returnInvoiceSearchResults(token); });
    </script>

@endsection