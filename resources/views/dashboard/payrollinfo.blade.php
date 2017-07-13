@extends('layouts.app')

@section('title', 'Current Payroll Info')

@section('content')

    <div class="row">
        <div class="col-xs-12">
            <div class="page-header"><h1>Payroll Information <br><small>Next Payday: {{date('F j, Y', strtotime('next wednesday'))}}</small></h1></div>
        </div>
    </div>
    <div class="row pb-10">
        <div class="col-xs-12">
            <ul class="list-inline list-unstyled">
                <li>
                    <label for="datepicker">Pay Date</label>
                    <select class="selectpicker" id="datepicker">
                        @if(count($dates) == 0)
                            <option value="-1">No Dates</option>
                        @else
                            @foreach($dates as $d)
                                <option value="{{date_create_from_format('Y-m-d', $d->pay_date)->format('m-d-Y')}}" @if($dates->first()->pay_date == $d->pay_date)selected@else&nbsp;@endif>{{date_create_from_format('Y-m-d', $d->pay_date)->format('m-d-Y')}}</option>
                            @endforeach
                        @endif
                    </select>
                </li>
                <li>
                    <label for="vendorpicker">Campaign</label>
                    <select class="selectpicker" id="vendorpicker">
                        <option value="-1">All Campaigns</option>
                        @foreach($vendors as $v)
                            <option value="{{$v->id}}">{{$v->name}}</option>
                        @endforeach
                    </select>
                </li>
            </ul>
        </div>
    </div>
    <div class="row">
        <div class="col-xs-8">
            <table class="table">
                <thead>
                <tr class="bg-primary">
                    <th>Employee Name</th>
                    <th>Amount Owed</th>
                    <th>Campaign</th>
                    <th>Paid</th>
                </tr>
                </thead>
                <tbody id="TABLE_ROWDATA">
                @if(count($employees) == 0)
                    <tr class="bg-white">
                        <td colspan="3" class="text-center"><i class="ion ion-sad"></i> No Results Found</td>
                    </tr>
                @else
                    @foreach($employees as $e)
                        <tr class="bg-white {{($e->is_paid == 1) ? "success" : ""}}" data-parent="true" data-parentid="{{$e->id}}">
                            <td>{{$e->agent_name}}</td>
                            <td>${{$e->amount}}</td>
                            <td>{{$vendors->first(function($v, $k)use($e){return $v->id == $e->vendor_id;})->name}}</td>
                            <td>
                                <input type="checkbox" id="paid-confirm" value="{{$e->is_paid}}" {{($e->is_paid == 1) ? "checked" : ""}}/>
                            </td>
                        </tr>
                    @endforeach
                @endif
                </tbody>
            </table>
        </div>
    </div>

@endsection


@section('scripts')

    <script type="text/javascript">
        $(document.body).on('click', '#paid-confirm', function(){
            $(this).parent().parent().toggleClass('success');

            var data = {
                value: !!($(this).is(':checked')),
                parentid: $(this).closest('[data-parent="true"]').data('parentid')
            };

            handlePaidConfirmClick(data);
        });

        $('#datepicker').on('change', function(){
            var date = moment($(this).val(), 'MM-DD-YYYY').format('YYYY-MM-DD');
            var inputParams = {
                vendor: $('#vendorpicker').val(),
                date: date
            };

            var options = {
                url: '/refreshPayrollTracking',
                type: 'GET',
                dataType: 'html',
                data: inputParams,
                afterData: afterData
            };

            fireAjaxRequest(options);

            function afterData(data){
                if(data){
                    $('#TABLE_ROWDATA').html(data);
                } else {
                    setMessageContainer('Something went wrong. Please try again later!', null, 'danger');
                }
            }
        });

        $('#vendorpicker').on('change', function(){
            var date = moment($('#datepicker').val(), 'MM-DD-YYYY').format('YYYY-MM-DD');
            var inputParams = {
                vendor: $(this).val(),
                date: date
            };

            var options = {
                url: '/refreshPayrollTracking',
                type: 'GET',
                dataType: 'html',
                data: inputParams,
                afterData: afterData
            };

            fireAjaxRequest(options);

            function afterData(data){
                if(data){
                    $('#TABLE_ROWDATA').html(data);
                } else {
                    setMessageContainer('Something went wrong. Please try again later!', null, 'danger');
                }
            }
        });
    </script>

@endsection