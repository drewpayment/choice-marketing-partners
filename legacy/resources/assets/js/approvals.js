
/*
    EVENT DRIVEN FUNCTIONS
 */
$(document).on('click', '#comment-decline', (e) => {
    let el = $(e.target),
        id = el.closest('[data-parent="true"]').data('id');

    let options = {
        url: 'comment/delete/' + id,
        type: 'POST',
        afterData: afterData
    };

    fireAjaxRequest(options);

    function afterData(data){
        if(data.length){
            refreshCommentApprovals();
        }
    }
});


$(document).on('click', '#comment-approve', (e) => {
    let el = $(e.target),
        id = el.closest('[data-parent="true"]').data('id');

    fireAjaxRequest({
        url: 'comment/' + id + '/approve',
        type: 'GET',
        dataType: 'json',
        afterData: afterData
    });

    function afterData(data){
        if(!data){
            setMessageContainer('Sorry, we ran into a problem. Please refresh the page and try again.', null, 'danger');
        } else {
            refreshCommentApprovals();
            setMessageContainer('Comment approved!');
        }
    }

});


/*
    HTTP HELPERS
 */

function refreshCommentApprovals(){
    let el = $('#comment-content');

    fireAjaxRequest({
        url: 'refresh-pending-comments',
        dataType: 'html',
        afterData: afterData
    });

    function afterData(data){
        if(!data)
            setMessageContainer("We encountered an error! Please try again!", null, 'danger');

        setMessageContainer('Success!');

        el.find('*').remove();
        el.html(data);
    }

}