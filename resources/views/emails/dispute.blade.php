@extends('layouts.app')

@section('content')

<div class="row">
	<div class="col-xs-10 pt-20">
		<h4>
			We get it, sometimes these commissionable sales just don't add up. Are you missing a sale? Maybe you got too many! Whatever your question, we have an answer. Fill out the form and we'll be sure to get back to you within the next 48 hours. 
		</h4>
	</div>
</div>
<div class="line-break-50"></div>
<div class="row">
	<div class="col-xs-6">
		<form id="disputeForm">
			<div class="form-horizontal">
				<div class="form-group">
					<label class="col-xs-2 control-label text-right" for="agentName">Name</label>
					<div class="col-xs-10">
						<input class="form-control" type="text" name="agentName" id="agentName" required>
					</div>
				</div>
				<div class="form-group">
					<label class="col-xs-2 control-label text-right" for="agentEmail">Email</label>
					<div class="col-xs-10">
						<input class="col-xs-5 form-control" type="email" name="agentEmail" id="agentEmail" required>
					</div>
				</div>
				<div class="form-group">
					<label class="col-xs-2 control-label text-right" for="phoneNumber">Number</label>
					<div class="col-xs-10">
						<input class="col-xs-5 form-control" type="number" name="agentNumber">
					</div>
				</div>
				<div class="form-group">
					<label class="col-xs-2 control-label text-right" for="agentMsg">Message</label>
					<div class="col-xs-10">
						<textarea class="col-xs-5 form-control"></textarea>
					</div>
				</div>
				<div class="form-group">
					<div class="col-xs-offset-2 col-xs-10">
						<button type="submit" class="btn btn-default">Send</button>
					</div>
				</div>
			</div>
		</form>
	</div>
</div>

@endsection