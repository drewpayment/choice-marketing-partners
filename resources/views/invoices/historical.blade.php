@extends('layouts.app')

@section('content')

<div class="row pt-10">
	<div class="col-xs-8">
		<h2>View an Invoice <small>pick an agent and an issue date</small></h2>
	</div>
</div>

<div class="row pt-20">
	<div class="col-xs-10" id="control-bar">
		<ul class="list-inline">
			<li>
				<span><h4>Agent: </h4></span>
				<meta name="csrf-token" content="{{ csrf_token() }}" />
			</li>
			<li>
				<select class="selectpicker" id="employee" data-live-search="true">
					<option value="-1" selected>Select Agent</option>
					@if(!$emps->contains('id', $self->id))
						<option value="{{$self->id}}">{{$self->name}}</option>
					@endif
					@foreach($emps as $emp)
						<option value="{{$emp->id}}">{{$emp->name}}</option>
					@endforeach
				</select>
			</li>
			<li>
				<span><h4>Issue Date: </h4></span>
			</li>
			<li>
				<select class="selectpicker" id="issueDate" data-mobile="true"></select>
			</li>
			<li>
				@if($isAdmin)
				<div id="deletePaystubBtn"></div>
				@else
				<div></div>
				@endif
			</li>
		</ul>
	</div>
</div>
<div class="row pt-20">
	<div class="col-xs-10">
		<div id="paystub"></div>
	</div>
</div>

@endsection

@section('scripts')

<script>
	// load paystub dates on agent pick
	$('#employee').on('change', function(){
		var token = $('meta[name="csrf-token"]').attr('content'),
			agentid = $(this).val();

		$.ajax({
			url: '/getissuedates',
			type: 'GET',
			data: {
				id: agentid
			},
			dataType: 'html'
		}).done(function(data){
		    if(data){
		        $('#paystub').html('');
                $('#issueDate').html(data);
                $('#issueDate').selectpicker('refresh');
                $('#deletePaystubBtn').addClass('hidden');
			}
		});
	});

	$('#issueDate').on('change', function(){
		var agentId = $('#employee').val(),
			token = $('meta[name="csrf-token"]').attr('content'),
			date = $('#issueDate').val();

		$.ajax({
			url: '/getpaystub',
			type: 'POST',
			data: {
				_token: token,
				date: date,
				id: agentId
			},
			dataType: 'html'
		}).done(function(data){
			$('#paystub').html(data);

			// finish this, need to create functionality with delete button to remove invoice, verify action with modal and then delete
			$('#deletePaystubBtn').html("<button type='button' class='btn btn-primary' data-tag='7' data-vero='button'>Delete</button>");
			$('#deletePaystubBtn').removeClass('hidden');
			var el = document.getElementById("deletePaystubBtn");
			el.addEventListener("click", handleClick, false);
		});
	});


    $('#modal_layout').on('click', '[data-tag="8"]', handleClick);

</script>

@endsection
