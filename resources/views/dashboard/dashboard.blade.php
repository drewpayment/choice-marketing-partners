@extends('dashboard.layout', ['container' => 'container-fluid', 'useWrapper' => true])

@section('title', 'Admin Dashboard')

@section('wrapper-title', 'My Dashboard')

@section('wrapper-content')

{{--    <div class="row">--}}
{{--        <div class="col-md-6">--}}
{{--            <div class="box box-default">--}}
{{--                <div class="box-title">--}}
{{--                    <h3 class="b-b">Payroll Processing</h3>--}}
{{--                </div>--}}
{{--                <div class="box-content">--}}
{{--                    <div class="box-content-title">--}}
{{--                        <strong>Important: </strong> In case of a situation where something doesn't look right with your payroll, this is how you can "re-run" payroll--}}
{{--                        for a given date. When should you resort to clicking these buttons? Only, and ONLY IF you have someone is missing an invoice, but you can see their total--}}
{{--                        listed when you look at Payroll Tracking.--}}
{{--                    </div>--}}
{{--                    <div class="row">--}}
{{--                        <div class="col-md-12">--}}
{{--                            <div class="form-group">--}}
{{--                                <label for="payroll-dates">Payroll Dates</label>--}}
{{--                                <select class="form-control" id="payroll-dates">--}}
{{--                                    @foreach($dates as $d)--}}
{{--                                        <option value="{{$d}}">{{$d->display_date}}</option>--}}
{{--                                    @endforeach--}}
{{--                                </select>--}}
{{--                            </div>--}}
{{--                            <button type="button" class="btn btn-primary" id="submit-payroll" data-toggle="modal" data-target="#confirm-process-modal">Submit</button>--}}
{{--                        </div>--}}
{{--                    </div>--}}
{{--                </div>--}}
{{--            </div>--}}
{{--        </div>--}}
{{--    </div>--}}

    <cmp-settings-outlet></cmp-settings-outlet>

    <div class="modal fade" tabindex="-1" role="dialog" id="confirm-process-modal">
        <div class="modal-dialog" role="document">
            <div class="modal-content">
                <div class="modal-body">
                    <h4>Are you sure you want to do this?</h4>
                    <p>
                        If you re-process payroll, this will not impact any invoices you've created, but it is going to check all active incoives and create
                        the map that the system uses to show who has an invoice and who doesn't. This action cannot be undone after you have submitted this.
                    </p>
                    <p>
                        There is <b>NO TURNING BACK</b> so please be sure before you re-process payroll for:
                    </p>
                    <div class="strong wp-100 text-center" id="reprocess-date" style="font-size:24px;"></div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-default pull-left" data-dismiss="modal">Canel</button>
                    <button type="button" class="btn btn-primary pull-right" id="save-confirmed">Confirm</button>
                </div>
            </div><!-- /.modal-content -->
        </div><!-- /.modal-dialog -->
    </div><!-- /.modal -->


@endsection

@section('scripts')

    <script type="text/javascript">
        var selected,
            $modal = $('div.modal');

        $modal.on('show.bs.modal', function() {
            selected = JSON.parse($('#payroll-dates').val());
            $('#reprocess-date').html(selected.display_date);
        });

        $('#save-confirmed')
            .on('click', function() {
                fireAjaxRequest({
                    url: '/process-payroll/' + selected.issue_date,
                    type: 'GET',
                    dataType: 'json',
                    success: afterData
                });
            });

        function afterData(data) {
            if(data) {
                setMessageContainer(
                    'Your payroll has been processed for ' + selected.display_date + '.',
                    null,
                    'info'
                );
                $modal.modal('hide');
            } else {
                console.log('failed!');
            }
        }

    </script>

@endsection