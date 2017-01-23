
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