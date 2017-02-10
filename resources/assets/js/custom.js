var tag = {

	SUBMIT_INVOICE_BTN: 1

};

// after event controls


function processDataTag(data){

	if (data.tag === tag.SUBMIT_INVOICE_BTN) handleSubmitNewInvoice(data);

}


function afterEventControl(evt){

	if(evt.target !== evt.currentTarget){
		var elem = $(evt.target),
			dataList = elem.data(),
			data = {};

		data.e = evt.target;
		data.tag = dataList["tag"];

		if(dataList["parentid"] == undefined) {
			var parent = (elem.closest('[data-parent="true"]').length > 0) ? elem.closest('[data-parent="true"]') : $('[data-parent="true"]');
			data.parent = parent;
			data.parentid = ($(parent).data('parentid') === undefined) ? null : $(parent).data('parentid');
		} else {
		    data.parentid = dataList["parentid"];
		    data.parent = $('[data-parentid="'+data.parentid+'"]').get();
        }


		processDataTag(data);
	}

	evt.stopPropagation();
}


// wire up events

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
            container.addEventListener("click", afterEventControl, false);




            container = null;
        }
    }

}


// JS helper functions

function cleanArray(data, hot) {
    var temp = {};

    $.each(data, function(idx, obj){
       if(!hot.isEmptyRow(idx)) temp[idx] = obj;
    });

    return temp;

}

