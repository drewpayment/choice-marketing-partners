@extends('layouts.app')

@section('content')
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
                                <select id="issueDates" class="selectpicker">
                                    @foreach($issueDates as $d)
                                        <option value="{{$d}}">{{\Carbon\Carbon::createFromFormat('Y-m-d', $d)->format('m-d-Y')}}</option>
                                    @endforeach
                                </select>
                            </li>
                            <li>
                                <label for="vendorList"><i class="fa fa-pencil-square-o"></i> Campaigns</label><br>
                                <select id="vendorList" class="selectpicker">
                                    <option value="-1">All</option>
                                    <option value="1">Palmco</option>
                                    <option value="2">AEP</option>
                                    <option value="3">Santanna</option>
                                </select>
                            </li>
                            <li>
                                <label for="agentList"><i class="fa fa-male"></i> Agents</label><br>
                                <select id="agentList" class="selectpicker" data-live-search="true">
                                    <option value="-1">All Agents</option>
                                    @foreach($agents as $a)
                                        <option value="{{$a->id}}">{{$a->name}}</option>
                                    @endforeach
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
                            @include('paystubs._stubrowdata', [
                            'paystubs' => $paystubs,
                            'agents' => $agents,
                            'vendors' => $vendors])
                        </tbody>
                    </table>
                </div>

            </div>
        </div>
    </div>
</div>

@endsection


@section('scripts')

    <script type="text/javascript">
        (function(){

            var inputParams = {
                date: $('#issueDates').val(),
                vendor: $('#vendorList').val(),
                agent: $('#agentList').val()
            };


            /**
             * filter list of paystubs
             *
             */
            $('#filterBtn').on('click', function(){
                inputParams.date = $('#issueDates').val();
                inputParams.vendor = $('#vendorList').val();
                inputParams.agent = $('#agentList').val();

                filterPaystubs();
            });

            var filterPaystubs = function(){
                var options = {
                    url: '/paystubs/filter-paystubs',
                    type: 'POST',
                    data: {
                        inputParams: inputParams
                    },
                    dataType: 'html',
                    afterData: afterData
                };

                fireAjaxRequest(options);

                function afterData(data){
                    if(data){
                        $('#paystub_row_data').html(data);
                    } else {
                        setMessageContainer('An error has occurred! Please try again later.', null, 'danger');
                    }

                }
            };

            /**
             * event handler for clicks on rows and showing paystubs
             *
             */
            $('[data-stub="true"]').on('click', function(){
                var el = $(this);
                var input = {
                    date: inputParams.date,
                    vendor: el.data('vid'),
                    agent: el.data('aid')
                };

                var options = {
                    url: '/paystubs/pdf-detail',
                    type: 'POST',
                    data: {
                        inputParams: input
                    },
                    dataType: 'html',
                    afterData: afterData
                };

                fireAjaxRequest(options);

                function afterData(data){

                    if(data){
                        var modal = $('#modal_layout');
                        modal.html(data);
                        modal.on('shown.bs.modal', function(){



                        }).on('hidden.bs.modal', function(){
                            modal.html('');
                        }).modal('show');
                    } else {
                        setMessageContainer('An error has occurred! Please try again later.', null, 'danger');
                    }

                }
            });

        })();
    </script>

@endsection