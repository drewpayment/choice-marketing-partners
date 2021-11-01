// load paystub dates on agent pick
$('#employee').on('change', function(){
    var token = $('meta[name="csrf-token"]').attr('content'),
        agentid = $(this).val();

    $.ajax({
        url: '/getissuedates',
        type: 'GET',
        data: {
            id: agentid
        },
        dataType: 'html'
    }).done(function(data){
        if(data){
            $('#paystub').html('');
            $('#issueDate').html(data);
            $('#issueDate').selectpicker('refresh');
            $('#deletePaystubBtn').addClass('hidden');
        }
    });
});

$('#issueDate').on('change', function(){
    var agentId = $('#employee').val(),
        token = $('meta[name="csrf-token"]').attr('content'),
        date = $('#issueDate').val();

    $.ajax({
        url: '/getpaystub',
        type: 'POST',
        data: {
            _token: token,
            date: date,
            id: agentId
        },
        dataType: 'html'
    }).done(function(data){
        $('#paystub').html(data);
    });
});


$('#modal_layout').on('click', '[data-tag="8"]', handleClick);