/**
 * Created by drewpayment on 2/19/17.
 */



$(function(){
    $.ajaxSetup({
        headers: { 'X-CSRF-TOKEN': $('meta[name="_token"]').attr('content') }
    })
});