@extends('dashboard.layout', ['container' => 'container-fluid', 'useWrapper' => true])

@section('title', 'Payroll Release Restriction')

@section('topCSS')
    <link rel="stylesheet" href="{{url('/css/wickedpicker.min.css')}}" />
@endsection

@section('wrapper-title', 'Paystub Restriction Time')

@section('wrapper-content')

    <div class="box box-default">
        <div class="box-content">
            {{--<div id="vue-app"></div>--}}
            <div class="row">
                <div class="col-md-12">
                    <h3>Please use the input below to select a time that the paystubs should be released.</h3>
                    <h4>WARNING: The time below immediately affects when all sales agents can see paystubs on each Tuesday of the current week.</h4>
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