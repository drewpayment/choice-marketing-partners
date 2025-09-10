var managerId;

var REGEX_EMAIL = '([a-z0-9!#$%&\'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&\'*+/=?^_`{|}~-]+)*@' +
    '(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)';

var emps = JSON.parse($('#jsobject').html());

var $select = $('#employeeList').selectize({
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

            var selectize = $select[0].selectize;
            selectize.clear();
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
                    $(this).off();

                })

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
//# sourceMappingURL=detail.js.map
