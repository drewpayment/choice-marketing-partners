(function(){

    var inputParams = {
        date: $('#issueDates').val(),
        vendor: $('#vendorList').val(),
        agent: $('#agentList').val()
    };


    /**
     * Event fired when you click the filter button. Returns
     * a list of paystubs based on the input params.
     */
    $('#filterBtn').on('click', function(){
        inputParams.date = $('#issueDates').val();
        inputParams.vendor = $('#vendorList').val();
        inputParams.agent = $('#agentList').val();

        var loading = '<tr><td colspan="3" class="text-center"><i class="fa fa-spinner fa-spin fa-5x"></i></td></tr>';

        $('#paystub_row_data').html(loading);

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
    $(document).on('click', '[data-stub="true"]', function(){
        var el = $(this);
        var input = {
            date: inputParams.date,
            vendor: el.data('vid'),
            agent: el.data('aid')
        };

        var form = el.find('#form');
        form.find('#date').val(input.date);
        form.find('#vendor').val(input.vendor);
        form.find('#agent').val(input.agent);

        form.submit();
    });


    /**
     * browser caching utility -
     * on window unload, sets hidden input and on browser back btn,
     * reloads page with valid data
     *
     */
    $(document).ready(function(){
        if($('#pageRefresh').val() == 1) {
            var tbl = $('.table-responsive');
            tbl.addClass('text-center').html('');
            tbl.html('<i class="fa fa-circle-o-notch fa-spin fa-5x"></i>');
            location.reload();
        }
    });

    $(window).on('unload', function(){
        $('#pageRefresh').val(1);
    });

})();