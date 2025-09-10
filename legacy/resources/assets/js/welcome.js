
if (jQuery) {
    App = (function(){

        var commaClubLinks = '[data-commalink="true"]';
    
        var init = function() {
            $(commaClubLinks).on('click', function(){
    
                var id = $(this).data('value');
    
                var options = {
                    url: '/returnCommaClubListByID',
                    type: 'POST',
                    data: {
                        id: id
                    },
                    dataType: 'HTML',
                    afterData: afterData
                };
    
                fireAjaxRequest(options);
    
                function afterData(data){
    
                    var modal = $('#modal_layout');
                    modal.html(data);
    
                    modal.on('hidden.bs.modal', function(){
                        modal.removeData();
                        modal.html('');
                    }).on('show.bs.modal', function(){
    
                    }).on('shown.bs.modal', function(){
    
                        $('img').each(function(){
                            var deg = $(this).data('rotate');
                            var rotate = 'rotate('+deg+'deg)';
                            $(this).css({
                                '-webkit-transform': rotate,
                                '-moz-transform': rotate,
                                '-o-transform': rotate,
                                '-ms-transform': rotate,
                                'transform': rotate
                            });
                        });
                    }).modal('show');
    
                }
            });
    
        };
    
        return {
            init: init
        }
    
    })(jQuery);
    
    $(document).ready(function(){
        App.init();
    });
}
