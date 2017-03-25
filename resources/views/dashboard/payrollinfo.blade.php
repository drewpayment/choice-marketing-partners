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
                    <select class="selectpicker show-tick" id="datepicker">
                        @foreach($dates as $d)
                            <option value="{{date_create_from_format('Y-m-d', $d->pay_date)->format('m-d-Y')}}" @if($dates->first()->pay_date == $d->pay_date)selected@else&nbsp;@endif>{{date_create_from_format('Y-m-d', $d->pay_date)->format('m-d-Y')}}</option>
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
                    <th>Paid</th>
                </tr>
                </thead>
                <tbody id="TABLE_ROWDATA">
                @foreach($employees as $e)
                    <tr class="bg-white {{($e->is_paid == 1) ? "success" : ""}}" data-parent="true" data-parentid="{{$e->id}}">
                        <td>{{$e->agent_name}}</td>
                        <td>${{$e->amount}}</td>
                        <td>
                            <input type="checkbox" id="paid-confirm" value="{{$e->is_paid}}" {{($e->is_paid == 1) ? "checked" : ""}}/>
                        </td>
                    </tr>
                @endforeach
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
            var data = {
                value: $(this).val(),
                parentid: $(this).closest('[data-parent="true"]').data('parentid')
            };

            refreshPayrollInfoTable(data);
        });
    </script>

@endsection