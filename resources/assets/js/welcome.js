
/** VARS
   All defined variables used in welcome.js
 */




/** FUNCTIONS
 All defined functions used in welcome.js
 */














/** PAGE LOAD FUNCTIONS
 Page load functions defined in welcome.js
 */


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
                remoteModal(data);
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