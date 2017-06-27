@extends('layouts.app')

@section('content')
<div class="row">
    <div class="col-xs-10 col-xs-offset-1">
        <div class="box box-default">
            <div class="box-title"><h2>Paystubs</h2></div>
            <div class="box-content">
                <div class="panel panel-primary">
                    <div class="panel-heading">
                        <ul class="list-inline list-unstyled">
                            <li>

                            </li>
                            <li>
                                <label for="issueDates"><i class="fa fa-calendar"></i> Dates </label>
                                <select id="issueDates" class="form-control">
                                    @foreach($issueDates as $d)
                                        <option value="{{$d}}">{{\Carbon\Carbon::createFromFormat('Y-m-d', $d)->format('m-d-Y')}}</option>
                                    @endforeach
                                </select>
                            </li>
                            <li>

                            </li>
                            <li>`
                                <label for="vendorList"><i class="fa fa-pencil-square-o"></i> Campaigns</label>
                                <select id="vendorList" class="form-control">
                                    <option value="1" selected>Palmco</option>
                                    <option value="2">AEP</option>
                                    <option value="3">Santanna</option>
                                </select>
                            </li>
                            <li>

                            </li>
                            <li>
                                <label for="agentList"><i class="fa fa-male"></i> Agents</label>
                                <select id="agentList" class="form-control">
                                    <option value="-1">All Agents</option>
                                    @foreach($agents as $a)
                                        <option value="{{$a->id}}">{{$a->name}}</option>
                                    @endforeach
                                </select>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
<div class="row">
    <div class="col-xs-10 col-xs-offset-1">
        <div class="box box-default">
            <div class="box-title">
                <h3>Results</h3>
            </div>
            <div class="box-content">
                <div class="table-responsive">
                    <table class="table table-striped">
                        <thead>
                        <tr>
                            <td>Name</td>
                            <td>Amount</td>
                        </tr>
                        </thead>
                        <tbody>
                        @foreach($paystubs as $p)
                            <tr class="cursor-clickable" data-invoice="true" data-invoiceid="{{$p->invoice_id}}">
                                <td>{{$agents->first(function($v, $k)use($p){return $v->id == $p->agentid;})->name}}</td>
                                <td>{{money_format('%.2n', $paystubs->where('agentid', $p->id)->sum('amount'))}}</td>
                            </tr>
                        @endforeach
                        </tbody>
                    </table>
                </div>

            </div>
        </div>
    </div>
</div>

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
                    {{$agents->first(function($v, $k)use($p){return $v->id == $p->agentid;})->name}}
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
@endsection