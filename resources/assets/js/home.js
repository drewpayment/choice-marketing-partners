/**
 * JS USED ON ROUTE '/'
 */

$(document).ready(function(){

    var drawerOpen = false;
    $('#menu-drawer').on('click', function(){
        var $this = $(this);
        var $holder = $('#drawer-holder');
        drawerOpen = !drawerOpen;

        var arrowElem = $this.find('i');
        if(drawerOpen){
            $holder.removeClass('mt-neg-60');
            $holder.animate({
                'margin-top': '-15px'
            });
            arrowElem.removeClass('fa-chevron-down').addClass('fa-chevron-up');
        } else {
            $holder.animate({
                'margin-top': '-60px'
            });
            arrowElem.removeClass('fa-chevron-up').addClass('fa-chevron-down');
        }
    });

    $('#pill_menu').find('a').on('click', function(e){
        e.preventDefault();

        $('html, body').animate({
            scrollTop: $($.attr(this, 'href')).offset().top
        }, 500);
    });

    $('#carousel').slick({
        autoplay: true,
        autoplaySpeed: 3000,
        appendArrows: $('.carousel-arrows'),
        prevArrow: $('#prevArrow'),
        nextArrow: $('#nextArrow')
    });

    $('#modal').on('hidden.bs.modal', function(){
        $('#modal').removeData();
    }).on('show.bs.modal', function(e){
        var button = $(e.relatedTarget);
        var modalType = button.data('modaltype');

        var modal = $(this);
        modal.find('.modal-title').text('Become our ' + modalType + ' today!');
    });

    $(document).on('click', '#sender-btn', function(e){
        e.stopPropagation();
        var modalForm = getModalForm();

        var options = {
            url: '/sendmodal',
            type: 'POST',
            dataType: 'JSON',
            data: {
                form: modalForm
            },
            afterData: afterData
        };

        fireAjaxRequest(options);

        function afterData(data){
            if(data){
                setMessageContainer('Sent!');
                $('#modal').modal('hide');
            } else {
                setMessageContainer('Something went wrong!');
                $('#modal').modal('hide');
            }
        }
    });

    var getModalForm = function(){
        var form = $('#EMAIL_FORM');
        return {
            name: form.find('#sender-name').val(),
            phone: form.find('#sender-phone').val(),
            email: form.find('#sender-email').val(),
            message: form.find('#sender-msg').val()
        }
    };

    function commaImageError(img){

        img.onerror = '';
        img.src = '/images/nouserimage.png';
        return true;
    }

});

