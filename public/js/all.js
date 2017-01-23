

/*
$('#editEmployeeBtn').on('click', function(){
	var $clickedBtn = $(this);
	var token = $('[data-token="true"]').data('value');
	var $modal = $('#modal_layout');

	$modal.on('show.bs.modal', function(){
		$.ajax({
			url: './editemployee/',
			type: 'POST',
			dataType: "html", 
			data: {
				id: $clickedBtn.data('value'),
				_token: token
			}
		}).done(function(data){
			var result = data;
			$modal.html(result);

		}).fail(function(event){
			var result = event.responseText;
			$modal.html(result);
		});
	})

	$modal.modal('show');
});
*/

$(function(){
	$modal = $('#modal_layout');
	$modal.on('hidden.bs.modal', function(){
		$modal.removeData();
		$modal.html('');
	});
});

function editEmployee(e){
	var $clickedBtn = $($(e)[0]);
	var token = $('[data-token="true"]').data('value');
	var $modal = $('#modal_layout');

	$modal.on('show.bs.modal', function(){
		$.ajax({
			url: './editemployee/',
			type: 'POST',
			dataType: "html", 
			data: {
				id: $clickedBtn.data('value'),
				_token: token
			}
		}).done(function(data){
			var result = data;
			$modal.html(result);

		}).fail(function(event){
			var result = event.responseText;
			$modal.html(result);
		});
	});

	$modal.modal('show');
}

// Vars

var SUBMIT_INVOICE_BTN = $('#submitTblBtn'),
	MODAL_ELEM = $('#modal_layout'),
	CANCEL_MODAL_BTN = $('#cancel-btn');





// Functions


function verifyOverrides(e){
	e.stopPropagation();

	$.ajax({
		url: '/upload/overrides-modal',
		type: 'GET',
		dataType: 'html'
	}).done(function(data){
		MODAL_ELEM.html(data);
	});

}


function submitInvoice(){
	if(salesList.length > 0) salesList = [];
	var hotData = hot.getData();
	var token = $('meta[name="csrf-token"]').attr('content');
	var agentid = $('#employee').val();
	var issuedt = new Date($('#issueDate').val());
	var wkending = $('#wkendDate').val();
	var vendor = $('#vendor').val();

	for(var i = 1; i < hotData.length + 1; i++){
		var s = setNewSale(hotData[i - 1]);
		s.id = i;
		s.agentid = agentid;
		s.issueDate = issuedt;
		s.wkending = wkending;
		s.vendor = vendor;
		salesList.push(s);
	}
	
	$.ajax({
		url: '/upload/invoice',
		type: 'POST',
		data: {
			_token: token,
			sales: salesList
		},
		dataType: 'JSON'
	}).done(function(data){
		$('#js_msgs').removeClass('hidden').html(data).fadeOut(2500, function(){
			hot.updateSettings({
				data: []
			});
		});
	});
}


function cancelInvoiceSubmission(){
	e.stopPropagation();
	console.log("It worked!");
}





// Register events

MODAL_ELEM.on('show.bs.modal', verifyOverrides(e));
CANCEL_MODAL_BTN.on('click', cancelInvoiceSubmission(e));
//# sourceMappingURL=all.js.map
