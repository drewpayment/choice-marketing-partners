@extends('layouts.app', ['containerClass' => 'container-fluid'])

@section('title', 'Admin Dashboard')

@section('topCSS')

    <link rel="stylesheet" href="{{url('/css/wickedpicker.min.css')}}" />

@endsection

@section('content')


    <div class="row">
        <div class="col-md-2">
            <div class="box box-default">
                <div class="box-title bg-primary">
                    <h3>{{Carbon\Carbon::now()->format('F j, Y')}}</h3>
                </div>
                <div class="box-content">
                    <ul class="nav nav-pills nav-stacked">
                        <li>
                            <a href="{{url('/')}}"><i class="fa fa-home"></i> Home</a>
                        </li>
                        <li class="divider"></li>
                        <li>
                            <a href="{{action('DocumentController@index')}}"><i class="fa fa-paperclip"></i> Documents</a>
                        </li>
                        <li>
                            {{--  <a href="/historical-invoice-data"><i class="fa fa-dollar"></i> Paystubs</a>  --}}
                            <a href="/payroll"><i class="fa fa-dollar"></i> Paystubs</a>
                        </li>
                        <li>
                            <a href="/agents"><i class="fa fa-users"></i> Agents</a>
                        </li>
                        <li>
                            <a href="/upload-invoice"><i class="fa fa-table"></i> Invoices</a>
                        </li>
                        <li class="divider"></li>
                        <li>
                            <a href="{{url('/overrides')}}"><i class="fa fa-cog"></i> Overrides</a>
                        </li>
                        <li>
                            <a href="{{url('/dashboards/payroll-info')}}" data-toggle="tooltip" title="Track who we have paid by issue date.">
                                <i class="fa fa-calculator"></i> Payroll Tracking
                            </a>
                        </li>
                        <li>
                            <a href="{{url('/vendors')}}">
                                <i class="fa fa-building"></i> Campaigns
                            </a>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
        <div class="col-md-10">
            <div class="box box-default">
                <div class="box-title bg-primary">
                    <h2>My Dashboard <i class="fa fa-dashboard"></i></h2>
                </div>
                <div class="box-content">
                    {{--<div id="vue-app"></div>--}}
                    <div class="row">
                        <div class="col-md-12">
                            <h2>Paystub Restriction Time</h2>
                            <p>Please use the input below to select a time that the paystubs should be released.</p>
                            <p>WARNING: The time below immediately affects when all sales agents can see paystubs on each Tuesday of the current week.</p>
                            <div class="form-group">
                                <label for="paystubRestriction">Release Paystub After (24-hour format only)</label>
                                <ul class="list-inline">
                                    <li data-hours="{{$time->hour}}">
                                        <select class="form-control" id="time-hours"></select>
                                    </li>
                                    <li>
                                        <h3>:</h3>
                                    </li>
                                    <li data-minute="{{$time->minute}}">
                                        <select class="form-control" id="time-minutes"></select>
                                    </li>
                                    <li>
                                        <button type="button" class="btn btn-primary" id="submitBtn"><i class="fa fa-save"></i> Save</button>
                                    </li>
                                    <li id="return-msg"></li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>


@endsection


@section('scripts')
    {{--this need to bring in VueJS router and pages...--}}

    <script src="{{url('/js/wickedpicker.min.js')}}"></script>
    <script type="text/javascript">

        function getLength(num){
            return num.toString().length;
        }

        $(document).ready(function(){
            var $timeHours = $('#time-hours');
            var $timeMinutes = $('#time-minutes');

            for(var i = 0; i < 60; i++){
                if(i < 24){
                    var strhr = (i < 10 ? "0" : "") + i;
                    $timeHours.append($('<option/>').val(strhr).html(strhr));
                }

                if(i % 10 === 0){
                    var strmin = (i < 10 ? "0" : "") + i;
                    $timeMinutes.append($('<option/>').val(strmin).html(strmin));
                }
            }

            var hour = $('li[data-hours]').data('hours');
            var min = $('li[data-minute]').data('minute');
            if(getLength(hour) === 2){
                $timeHours.val(hour);
            } else if(getLength(hour) === 1){
                $timeHours.val(0+hour);
            }

            if(getLength(min) === 2){
                $timeMinutes.val(min);
            } else if(getLength(min) === 1){
                $timeMinutes.val('0'+min);
            }
        });

        $(document).on('click', '#submitBtn', function(){
            var hours = $('#time-hours').val();
            var minutes = $('#time-minutes').val();

            var options = {
                url: '/savePaystubRestriction',
                type: 'POST',
                data: {
                    hour: hours,
                    min: minutes
                },
                dataType: 'JSON',
                afterData: afterData
            };

            fireAjaxRequest(options);

            function afterData(data){
                if(data){
                    var $msgbox = $('#return-msg');
                    $msgbox.html('<h3 class="bg-success p-5 br-5 m-0">Success! Your time has been saved</h3>')
                        .fadeOut(5000, function(){
                            $(this).html('').show();
                        });
                }

            }
        });

    </script>

@endsection