


var tag = {

	SUBMIT_INVOICE_BTN: 1,
	SHOW_ALL_EMP: 3,
    CONFIRM_PAYSTUB_DEL: 7,
    DELETE_PAYSTUB: 8

};

// after event controls


function processDataTag(data){
    // data.tag must be coerced, because they're set as string
    switch(+data.tag){
        case tag.SUBMIT_INVOICE_BTN:
            handleSubmitNewInvoice(data);
            break;
        case tag.SHOW_ALL_EMP:
            refreshEmployeesAfterControl(data);
            break;
        case tag.CONFIRM_PAYSTUB_DEL:
            showDeletePaystubConfirmDialog(data);
            break;
        case tag.DELETE_PAYSTUB:
            handleDeletePaystub(data);
            break;
        default:
            break;
    }
}


var handleClick = function(evt){
    evt.stopPropagation();
    var parent, dataList, data, element;

    var $target = $(evt.target);
    if($target.data('vero') != 'button') return false;
    dataList = $target.data();
    data = {};
    data.e = evt.target;

    if(dataList["parentid"] == undefined){
        parent = ($target.closest('[data-parent="true"]').length) ? $target.closest('[data-parent="true"]') : $('[data-parent="true"]');
        data.parent = parent;
        data.parentid = ($(parent).data('parentid') == undefined) ? null : $(parent).data('parentid');
    } else {
        data.parentid = dataList["parentid"];
        data.parent = $('[data-parentid='+data.parentid+'"]').get();
    }

    element = evt.target;
    // Cycle over each attribute on the element
    for (var i = 0; i < element.attributes.length; i++) {
        // Store reference to current attr
        attr = element.attributes[i];
        // If attribute nodeName starts with 'data-'
        if (/^data-/.test(attr.nodeName)) {
            // Log its name (minus the 'data-' part), and its value
            data[attr.nodeName.replace(/^data-/, '')] = attr.nodeValue;
        }
    }

    data.parentid = (data.parentid == null) ? -1 : data.parentid;
    data.tag = (data.tag === undefined) ? $(data.e).closest('[data-tag]').data('tag') : data.tag;

    processDataTag(data);
};


// handles blurs on input elements with "data-vero='text'"
var handleBlur = function(evt){
    evt.stopPropagation();
    var parent, elem, dataList, data, element;

    if($(evt.target).data('vero') != 'text') return false;
    if(evt.target.value == evt.target.defaultValue) return false;

    if(evt.target !== evt.currentTarget){
        elem = $(evt.target);
        dataList = elem.data();
        data = {};

        data.e = evt.target;
        data.value = $(elem).val();

        if(dataList["parentid"] == undefined) {
            parent = (elem.closest('[data-parent="true"]').length > 0) ? elem.closest('[data-parent="true"]') : $('[data-parent="true"]');
            data.parent = parent;
            data.parentid = ($(parent).data('parentid') === undefined) ? null : $(parent).data('parentid');
        } else {
            data.parentid = dataList["parentid"];
            data.parent = $('[data-parentid="'+data.parentid+'"]').get();
        }

        element = evt.target;
        // Cycle over each attribute on the element
        for (var i = 0; i < element.attributes.length; i++) {
            // Store reference to current attr
            attr = element.attributes[i];
            // If attribute nodeName starts with 'data-'
            if (/^data-/.test(attr.nodeName)) {
                // Log its name (minus the 'data-' part), and its value
                data[attr.nodeName.replace(/^data-/, '')] = attr.nodeValue;
            }
        }


        data.parentid = (data.parentid == null) ? -1 : data.parentid;
        data.tag = (data.tag === undefined) ? $(data.e).closest('[data-tag]').data('tag') : data.tag;

    } else {
        elem = $(evt.currentTarget);
        dataList = elem.data();
        data = {};

        data.e = elem;
        data.value = $(elem).val();

        if(dataList["parentid"] == undefined){
            parent = (elem.closest('[data-parent="true"]').length > 0) ? elem.closest('[data-parent="true"]') : $('[data-parent="true"]');
            data.parent = parent;
            data.parentid = ($(parent).data('parentid') === undefined) ? -1 : $(parent).data('parentid');
        } else {
            data.parentid = dataList["parentid"];
            data.parent = $('[data-parentid="'+data.parentid+'"]').get();
        }

        element = evt.currentTarget;
        for(var i = 0; i < element.attributes.length; i++){
            attr = element.attributes[i];
            if(/^data-/.test(attr.nodeName)){
                data[attr.nodeName.replace(/^data-/, '')] = attr.nodeValue;
            }
        }

        data.parentid = (data.parentid == null) ? -1 : data.parentid;
        data.tag = (data.tag === undefined) ? $(data.e).closest('[data-tag]').data('tag') : data.tag;
    }

    processDataTag(data);
};


/**
 * standard method to wire events, bool wireEvent and optionally specify container
 *
 * @param wireEvent
 * @param container
 */
function wireButtonEvents(wireEvent, container){

    // parent containers available on page load
    if(container === undefined || container === null) {
        container = document.querySelector('body');


    } else {
        container = document.querySelector(container);
    }



    if(wireEvent){
        // wire up initialized container
        if(container !== undefined && container !== null) {
            container.addEventListener("click", handleClick);
        }
    }

}


/**
 * set toast notification to show user successful message
 *
 * @param message
 * @param callback
 * @param messageType
 */
var setMessageContainer = function(message, callback, messageType){
    messageType = (messageType === undefined) ? 'primary' : messageType;
    messageType = (messageType === 'error') ? 'danger' : messageType;
    var icon = 'fa fa-thumbs-up';
    var isConfirm = false;
    var width = 200;

    if(messageType == 'danger'){
        icon = 'fa fa-warning';
        isConfirm = true;
        width = 350;
    } else if(messageType == 'info'){
        icon = 'fa fa-info';
    }


    var myToast = new ax5.ui.toast({
        width: width,
        icon: '<i class="'+icon+'"></i>',
        containerPosition: "bottom-right"
    });

    if(isConfirm){
        myToast.confirm({
            theme: messageType,
            msg: message
        })
    } else {
        myToast.push({
            theme: messageType,
            msg: message
        });
    }

    if(callback == typeof 'function') callback.call();
};


/**
 * JavaScript helper functions in website
 */


/**
 * remove empty entries in object array
 * @param data
 * @param hot
 * @returns {{}}
 */
function cleanArray(data, hot) {
    var temp = {};

    $.each(data, function(idx, obj){
       if(!hot.isEmptyRow(idx)) temp[idx] = obj;
    });

    return temp;
}


/**
 * create universal modal within website, pass fillable html to modal and callback function for further action after modal is shown
 *
 * @param html
 * @param callback
 */
function remoteModal(html, callback){
    var modal = $('#modal_layout');
    modal.html(html);

    modal.on('hidden.bs.modal', function(){
        modal.removeData();
        modal.html('');
    }).on('shown.bs.modal', function(){
        if(callback === typeof 'function') callback.call();
    }).modal('show');

}


/**
 * handle ajax requests that return an error
 * @param data
 */
function ajaxErrorHandler(data){
    console.log(data.statusText);
    console.dir(data);
}


function ajaxSuccessHandler(data){
    console.log("The success handler was not defined.");
    console.dir(data);
}


/**
 * standard ajax request handler
 * @param options
 */
function fireAjaxRequest(options){
    if(options === undefined) ajaxErrorHandler("Options object is undefined.");

    var successFn;

    if(options.afterData !== undefined){
        successFn = options.afterData;
    } else if (options.success !== undefined){
        successFn = options.success;
    } else {
        successFn = ajaxSuccessHandler();
    }

    var settings = {
        url: (options.url === undefined) ? null : options.url,
        type: (options.type === undefined) ? 'GET' : options.type,
        data: (options.data === undefined) ? {} : options.data,
        processData: (options.processData === undefined),
        dataType: (options.dataType === undefined) ? 'JSON' : options.dataType,
        success: successFn,
        error: (options.errorData === undefined) ? ajaxErrorHandler : options.errorData
    };

    $.ajax(settings);
}