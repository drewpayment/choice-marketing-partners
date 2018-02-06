@extends('layouts.app')

@section('title', 'Paystub Detail')

@section('content')

<div class="row p-10" id="paystub-controls">
	<div class="col-xs-5">

		<form id="pdfForm" action="{{url('payroll/printable')}}" method="POST">
			<input type="hidden" name="_token" value="{{csrf_token()}}" />
			<input type="hidden" id="agent" name="agent" value="{{$emp->id}}" />
			<input type="hidden" id="vendor" name="vendor" value="{{$vendorId}}" />
			<input type="hidden" id="date" name="date" value="{{$invoiceDt}}" />

			<button type="button" class="btn btn-default display-inline" onclick="history.back()">
				<i class="fa fa-arrow-circle-left"></i> Back
			</button>
			<button type="submit" class="btn btn-default display-inline" id="generatePdf" formtarget="_blank">
				<i class="fa fa-print"></i> Print Version
			</button>
			@if($isAdmin)
				<button type="button" class="btn btn-default display-inline" id="editPaystub">
					<i class="fa fa-pencil"></i> Edit Invoice
				</button>
				<button type="button" class="btn btn-danger display-inline" data-toggle="modal" data-target="#deleteModal">
					<i class="fa fa-remove"></i> Delete Invoice
				</button>
			@endif
		</form>
	</div>
</div>

<div class="paystub-wrapper">
	<div class="row p-10">
		<div class="col-xs-12">
			<div class="paystub-header">
				<h1>Choice Marketing Partners <small>- {{$vendor}}</small></h1>

				<div class="row">
					<div class="col-xs-4">
						<address>
							<strong>Choice Marketing Partners</strong><br>
							3835 28th St Ste 105<br>
							Grand Rapids MI 49512
						</address>
					</div>
					<div class="col-xs-4">&nbsp;</div>
					<div class="col-xs-4">
						<strong>Weekending: </strong> {{date('m-d-Y', strtotime($stubs->first()->wkending))}} <br>
						<strong>Invoice Date: </strong> {{$invoiceDt}} <br>
						<br>
						<strong>Payable To: </strong> {{$emp->name}}
					</div>
				</div>
			</div>
			<div class="paystub">
				<table class="table">
					<thead>
						<tr>
							<th class="w-120">Sale Date</td>
							<th class="w-200">Customer Name</td>
							<th class="w-300">Address</td>
							<th class="w-100">Commissionable</td>
							<th class="w-120 text-right">Amount</td>
						</tr>
					</thead>
					<tbody>
						@foreach($stubs as $s)
						<tr>
							<td>{{$s->sale_date}}</td>
							<td class="text-lowercase text-capitalize">{{$s->first_name}} {{$s->last_name}}</td>
							<td class="text-lowercase text-capitalize">{{$s->address}} {{$s->city}}</td>
							<td class="text-lowercase text-capitalize">{{$s->status}}</td>
							<td class="text-right">
								@if(is_numeric($s->amount))
									$ {{number_format((float)$s->amount, 2)}}
								@else
									{{$s->amount}}
								@endif
							</td>
						</tr>
						@endforeach
						@if(count($overrides) > 0)
							<tr>
								<td colspan="5">
									<h4>
										<strong>Overrides</strong>
									</h4>
								</td>
							</tr>
							<tr class="strong">
								<td>Agent Name</td>
								<td>&nbsp;</td>
								<td>Sales</td>
								<td>Commission</td>
								<td>&nbsp;</td>
							</tr>
						@endif
						@foreach($overrides as $over)
							<tr>
								<td>{{$over->name}}</td>
								<td>&nbsp;</td>
								<td>{{$over->sales}}</td>
								<td>{{$over->commission}}</td>
								<td class="text-right">$ {{number_format($over->total, 2)}}</td>
							</tr>
						@endforeach
						@if(count($expenses) > 0)
							<tr class="b-b">
								<td colspan="5">
									<h4>
										<strong>Expenses</strong>
									</h4>
								</td>
							</tr>
							<tr class="strong">
								<td>Type</td>
								<td colspan="4">Notes</td>
							</tr>
						@endif
						@foreach($expenses as $exp)
							<tr>
								<td>{{$exp->type}}</td>
								<td colspan="3">{{$exp->notes}}</td>
								<td class="text-right">$ {{number_format($exp->amount, 2)}}</td>
							</tr>
						@endforeach
						{{-- paystub footer --}}
						<tr>
							<td colspan="5">{{-- spacer --}}</td>
						</tr>
						<tr>
							<td>&nbsp;</td>
							<td>&nbsp;</td>
							<td>&nbsp;</td>
							<td><strong>Gross Pay</strong></td>
							<td class="text-right"><strong>$ {{number_format($gross, 2)}}</strong></td>
						</tr>
						<tr>
							<td>&nbsp;</td>
							<td>&nbsp;</td>
							<td>&nbsp;</td>
							<td><strong>TOTAL</strong></td>
							<td class="text-right"><strong>$ {{number_format($gross, 2)}}{{-- sum of rows --}}</strong></td>
						</tr>
					</tbody>
				</table>
			</div>
		</div>
	</div>
</div>

<div class="wp-100 text-center fade" id="delete-success-msg">
	<h2 class="bold">Successfully deleted!</h2>
	<h4 class="text-muted">(You will be redirected momentarily.)</h4>
</div>

<div class="modal fade" tabindex="-1" role="dialog" id="deleteModal">
	<div class="modal-dialog modal-sm" role="document">
		<div class="modal-content">
			<div class="modal-body text-center">
				<h3 class="bold">Are you sure you want to do this?</h3>
				<p class="text-muted">(This action cannot be done.)</p>
			</div>
			<div class="modal-footer">
				<button type="button" class="btn btn-default pull-left" data-dismiss="modal">Close</button>
				<button type="button" class="btn btn-danger" id="confirmDelete">
					<i class="fa fa-remove"></i> Delete
				</button>
			</div>
		</div><!-- /.modal-content -->
	</div><!-- /.modal-dialog -->
</div><!-- /.modal -->

@endsection

@section('scripts')

	<script type="text/javascript">

		$(function(){
            var elem = $('#editPaystub');
            var agentId = $('#agent').val();
            var vendorId = $('#vendor').val();
            var rawDate = $('#date').val();
            var date = moment(rawDate, 'MM-DD-YYYY').format('YYYY-MM-DD');
            if(elem.length){
                var url = '/invoices/show-invoice/' + agentId + '/' + vendorId + '/' + date;

                elem.on('click', function(){
                    window.location.href = url;
                });
            }

            $('#confirmDelete').on('click', function(){
                fireAjaxRequest({
                    url: '/paystub/delete/submit',
					type: 'POST',
					data: {
                        id: agentId,
						vendor: vendorId,
						date: rawDate
					},
					success: function() {
                        $('#delete-success-msg').addClass('in');
                        $('#deleteModal').modal('hide');
                        $('.paystub-wrapper').hide();
                        $('#paystub-controls').hide();
                        setMessageContainer('Your invoice has been successfully deleted.');

                        setTimeout(function(){
                            window.location.href = '/payroll';
                        }, 2000);
					}
                });
            });
		});

	</script>

@endsection