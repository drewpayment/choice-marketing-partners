/**
 * Created by drewpayment on 2/25/17.
 */


function showDeletePaystubConfirmDialog(data){

    $.ajax({
        url: '/paystub/delete/confirm',
        type: 'GET',
        dataType: 'html',
        success: afterData
    });

    function afterData(data){
        remoteModal(data, afterDeleteStubConfirmShow);
    }

}


function afterDeleteStubConfirmShow(){

    // do we need to do anything when the confirmation window is shown?

}


function handleDeletePaystub(data){

    var id = $('#employee').val();
    var date = $('#issueDate').val();
    var token = $('#global-token').attr('content');

    $.ajax({
        url: '/paystub/delete/submit',
        data: {
            _token: token,
            id: id,
            date: date
        },
        type: 'POST',
        dataType: 'json',
        success: afterData
    });

    function afterData(data){
        if(data){
            $('#modal_layout').modal('hide');
            window.location.reload();
        }
    }

}