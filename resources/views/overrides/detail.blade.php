@extends('layouts.app')

@section('title', 'Override Detail')

@section('content')

    <div class="row">
        <div class="col-xs-8 col-xs-offset-2">
            <div class="panel panel-default">
                <div class="panel-title text-center">
                    <h2 data-manager="true" data-managerid="{{$manager->id}}">{{$manager->name}}'s Agents</h2>
                    <p>Search for an agent below and add them to the list to give the manager access to their sales/payroll information.</p>
                </div>
                <div class="panel-body">
                    <div class="row">
                        <div class="col-xs-6 col-xs-offset-3">
                            <label for="employeeList"></label>
                            <input class="contact selectize" type="text" id="employeeList" autocomplete="on" placeholder="Search for Agent" />
                        </div>
                    </div>
                    <div class="table-responsive">
                        <table class="table table-bordered">
                            <thead>
                            <tr class="active">
                                <th class="w-10 text-center">Actions</th>
                                <th>Agent Name</th>
                            </tr>
                            </thead>
                            <tbody id="row-data">
                                @include('overrides._detailRowData', ['children' => $children])
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
        var managerId;

        var REGEX_EMAIL = '([a-z0-9!#$%&\'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&\'*+/=?^_`{|}~-]+)*@' +
            '(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)';
        var emps = [];
        @foreach($employees as $e)
            emps.push({!! $e !!});
        @endforeach
        $('#employeeList').selectize({
            persist: false,
            maxItems: 1,
            valueField: 'id',
            labelField: 'name',
            searchField: ['name'],
            options: emps,
            render: {
                item: function(item, escape) {
                    return '<div>' +
                        (item.name ? '<span class="name">' + escape(item.name) + '</span> ' : '') +
                        '</div>';
                },
                option: function(item, escape) {
                    var label = item.name;
                    return '<div>' +
                        '<span class="label">' + escape(label) + '</span> ' +
                        '</div>';
                }
            },
            onChange: function(value){
                if(value) {
                    confirmationBox(value);

                    managerId = $('[data-manager="true"]').data('managerid');
                }
            }
        });

        var confirmationBox = function(val){

            var options = {
                url: '/overrides/confirm-add-agent/'+val,
                dataType: 'html',
                afterData: afterData
            };

            fireAjaxRequest(options);

            function afterData(data){
                if(data){
                    var modal = $('#modal_layout');
                    modal.html(data);
                    modal.on('shown.bs.modal', function(){

                        $('#confirm-submit').on('click', function(){

                            var $el = $(this).closest('[data-parent="true"]');
                            var agentId = $el.data('parentid');
                            addAgentOverride(agentId);
                            modal.modal('hide');

                        });

                    }).on('hidden.bs.modal', function(){

                        modal.html('');
                        refreshDetail();

                    }).modal('show');
                }
            }

        };


        var addAgentOverride = function(id){

            var options = {
                url: '/overrides/handleAddAgentOverride',
                type: 'POST',
                data: {
                    agentId: id,
                    mgrId: managerId
                },
                afterData: afterData
            };

            fireAjaxRequest(options);

            function afterData(data){

                if(data){

                    setMessageContainer('Success!');

                }

            }

        };


        $(document).on('click', '#delete-override', function(){

            managerId = $('[data-manager="true"]').data('managerid');
            var id = $(this).closest('[data-parent="true"]').data('parentid');

            var options = {
                url: '/overrides/confirm-delete-agent/'+id,
                dataType: 'html',
                afterData: afterData
            };

            fireAjaxRequest(options);

            function afterData(data){
                if(data){
                    var modal = $('#modal_layout');
                    modal.html(data);
                    modal.on('shown.bs.modal', function(){

                        $('#confirm-submit').on('click', function(){

                            var $el = $(this).closest('[data-parent="true"]');
                            var agentId = $el.data('parentid');
                            deleteAgentOverride(agentId);
                            modal.modal('hide');

                        });

                    }).on('hidden.bs.modal', function(){

                        modal.html('');
                        refreshDetail();

                    }).modal('show');
                }
            }

        });

        var deleteAgentOverride = function(id){

            var options = {
                url: '/overrides/handleDeleteAgentOverride',
                type: 'POST',
                data: {
                    agentId: id,
                    mgrId: managerId
                },
                afterData: afterData
            };

            fireAjaxRequest(options);

            function afterData(data){
                if(data){
                    setMessageContainer('Success!');
                }
            }

        };


        var refreshDetail = function(){
            managerId = (managerId > 0) ? managerId : $('[data-manager="true"]').data('mangerid');

            var options = {
                url: '/overrides/refresh-detail/' + managerId,
                dataType: 'html',
                afterData: afterData
            };

            fireAjaxRequest(options);

            function afterData(data){
                if(data){
                    $('#row-data').html(data);
                }
            }
        }
    </script>

@endsection