@extends('layouts.app')

@section('content')

    <div class="row">
        <div class="col-xs-10 col-xs-offset-1">
            <div class="row">
                <div class="col-xs-10 col-xs-offset-1">
                    <div class="box box-default">
                        <div class="box-title pt-0">
                            <h2 class="page-header mb-0">Campaigns</h2>
                        </div>
                        <div class="box-content pt-0">
                            <h4>Manage active campaigns used by Choice Marketing Partners</h4>
                            If a campaign is missing, please <a href="mailto://drew.payment@choice-marketing-partners.com">email</a> support and let them know about your problem.
                        </div>
                    </div>
                    <div class="row">
                        <div class="col-xs-8 col-xs-offset-2">
                            <div class="box box-default">
                                <div class="box-content">
                                    <button type="button" id="addVendor" class="btn btn-default btn-sm mb-10">
                                        <i class="fa fa-plus"></i> Add Vendor
                                    </button>
                                    <ul class="list-group" id="rowData">
                                        @include('vendors._vendorRowData', ['vendors' => $vendors])
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

@endsection

@section('scripts')

    <script type="text/javascript">

        $(document).on('click', '#addVendor', function(){
            var options = {
                url: '/vendors/returnAddModal',
                type: 'GET',
                dataType: 'html',
                afterData: afterData
            };

            fireAjaxRequest(options);

            function afterData(data){
                var modal = $('#modal_layout');

                modal.html(data);
                modal.on('shown.bs.modal', function(){

                    $('#addVendorSubmit').on('click', handleAddVendor);

                }).on('hidden.bs.modal', function(){

                    $('#addvendorsubmit').off();

                }).modal('show');
            }
        });

        $(document).on('change', '[data-active="true"]', function(){
            var inputParams = {
                id: null,
                isActive: null
            };

            inputParams.id = $(this).closest('[data-parent="true"]').data('parentid');
            inputParams.isActive = $(this).is(':checked') ? 1 : 0;

            var options = {
                url: '/vendors/handleVendorActive',
                type: 'POST',
                dataType: 'JSON',
                data: {
                    inputParams: inputParams
                },
                afterData: afterData
            };

            fireAjaxRequest(options);

            function afterData(data){
                if(data){
                    setMessageContainer('Success!');
                } else {
                    setMessageContainer('Failed. Please try again later.', null, 'danger');
                }
            }
        });

        var handleAddVendor = function(){
            var modal = $('#modal_layout');
            var inputParams = {
                name: null
            };

            inputParams.name = $('#vendorName').val();

            var options = {
                url: '/vendors/handleAddVendor',
                type: 'POST',
                data: {
                    inputParams: inputParams
                },
                dataType: 'JSON',
                afterData: afterData
            };

            fireAjaxRequest(options);

            function afterData(data){
                if(data){
                    var row = $('#rowData');
                    row.parent().find('button').addClass('hidden');
                    row.parent().addClass('text-center');
                    row.html('<i class="fa fa-circle-o-notch fa-spin fa-5x"></i>');
                    refreshVendorData();
                    modal.modal('hide');
                    setMessageContainer('Successfully added campaign!', null);
                }
            }
        };

        var refreshVendorData = function(){
            var options = {
                url: '/vendors/refreshVendorRowData',
                type: 'GET',
                dataType: 'html',
                afterData: afterData
            };

            fireAjaxRequest(options);

            function afterData(data){

                if(data){
                    var row = $('#rowData');
                    row.parent().removeClass('text-center');
                    row.parent().find('button').removeClass('hidden');

                    row.html(data);
                }
            }
        };

    </script>

@endsection