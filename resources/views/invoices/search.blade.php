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
                            <option value="{{$d->issue_date}}" {{($d->issue_date == date(strtotime('next wednesday'))) ? "selected" : ""}}>{{$d->issue_date}}</option>
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
                <tbody id="TABLE_ROWDATA">
                    @foreach($invoices as $inv)
                        <tr>
                            <td>
                                <a href="{{url('/invoices/edit-invoice/'.$inv->campaign.'/'.$inv->name.'/'.$inv->issueDate)}}">{{$inv->name}}</a>
                            </td>
                            <td>
                                <a href="{{url('/invoices/edit-invoice/'.$inv->campaign.'/'.$inv->name.'/'.$inv->issueDate)}}">{{$inv->issueDate}}</a>
                            </td>
                            <td>
                                <a href="{{url('/invoices/edit-invoice/'.$inv->campaign.'/'.$inv->name.'/'.$inv->issueDate)}}">{{$inv->campaign}}</a>
                            </td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
        </div>
    </div>

@endsection