{{--  params available  --}}
{{--    isAdmin,        --}}
{{--    isManager,      --}}
{{--    emps,           --}}
{{--    paystubs,       --}}
{{--    agents,         --}}
{{--    issueDates,     --}}
{{--    vendors,        --}}
{{--    rows,           --}}
{{--    overrides,      --}}
{{--    expenses        --}}

@extends('layouts.app')

@section('title', 'Paystubs')

@section('content')

<div class="row">
    <div class="col-xs-10 col-xs-offset-1">
        <p>Having issues with the new paystub portal? <a class="btn btn-default btn-xs" href="/historical-invoice-data">Click here</a> to use the old one.</p>
    </div>
</div>

<div class="row">
    <div class="col-xs-10 col-xs-offset-1">
        <div class="box box-default">
            <div class="box-title"><h2 class="page-header m-0 mt-5"><i class="fa fa-bank"></i> Paystubs</h2></div>
            <div class="box-content">
                <div class="panel panel-primary">
                    <div class="panel-heading">
                        <ul class="list-inline list-unstyled">
                            <li>
                                <label for="issueDates"><i class="fa fa-calendar"></i> Dates </label><br>
                                <select id="issueDates" class="selectpicker" data-size="8">
                                    @foreach($issueDates as $d)
                                        <option value="{{$d}}">{{\Carbon\Carbon::createFromFormat('Y-m-d', $d)->format('m-d-Y')}}</option>
                                    @endforeach
                                </select>
                            </li>
                            <li>
                                <label for="vendorList"><i class="fa fa-pencil-square-o"></i> Campaigns</label><br>
                                <select id="vendorList" class="selectpicker" data-size="8">
                                    <option value="-1">All</option>
                                    @if($isAdmin || $isManager)
                                        @foreach($vendors as $v)
                                            <option value="{{$v->id}}">{{$v->name}}</option>
                                        @endforeach
                                    @else
                                        @foreach($vendors as $v)
                                            <option value="{{$v->id}}">{{$v->name}}</option>
                                        @endforeach
                                    @endif
                                </select>
                            </li>
                            <li>
                                <label for="agentList"><i class="fa fa-male"></i> Agents</label><br>
                                <select id="agentList" class="selectpicker" data-live-search="true" data-size="8">
                                    @if($isAdmin || $isManager)
                                        <option value="-1">All Agents</option>
                                        @foreach($agents as $a)
                                            <option value="{{$a['id']}}">{{$a['name']}}</option>
                                        @endforeach
                                    @else
                                        <option value="{{$agents[0]['id']}}">{{$agents[0]['name']}}</option>
                                    @endif
                                </select>
                            </li>
                            <li>
                                <button id="filterBtn" type="button" class="btn btn-default"><i class="fa fa-filter"></i> Filter</button>
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
                <h3 class="page-header mb-0 mt-5"><i class="fa fa-search"></i> Results</h3>
            </div>
            <div class="box-content">
                <div class="table-responsive">
                    <table class="table table-hover">
                        <thead>
                        <tr>
                            <th>Name</th>
                            <th>Campaign</th>
                            <th>Amount</th>
                        </tr>
                        </thead>
                        <tbody id="paystub_row_data">
                            @if(isset($paystubs) && count($paystubs) > 0)
                                @include('paystubs._stubrowdata', [
                                'paystubs' => $paystubs,
                                'agents' => $agents,
                                'vendors' => $vendors])
                            @else
                                <tr>
                                    <td colspan="3">
                                        <h2 class="text-center">
                                            <i class="fa fa-arrow-circle-up"></i> Select Campaign and Agents
                                        </h2>
                                    </td>
                                </tr>
                            @endif
                        </tbody>
                    </table>
                </div>

            </div>
        </div>
    </div>
</div>

<input type="hidden" id="pageRefresh" value="0" />

@endsection


@section('scripts')

    <script src="{{elixir('js/views/paystubs/paystubs.js')}}"></script>

@endsection