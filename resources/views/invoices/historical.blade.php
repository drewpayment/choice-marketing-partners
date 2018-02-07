@extends('layouts.app')

@section('title', 'Invoices')

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

<script src="{{elixir('js/views/invoices/historical.js')}}"></script>

@endsection
