
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