{{--DEPRECATED--}}

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
								<td>{{number_format($over->commission, 2)}}</td>
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
						{{--<tr>--}}
							{{--<td>&nbsp;</td>--}}
							{{--<td>&nbsp;</td>--}}
							{{--<td>&nbsp;</td>--}}
							{{--<td><strong>Other Pay</strong></td>--}}
							{{--<td class="text-right">--}}{{-- sum of rows --}}{{--</td>--}}
						{{--</tr>--}}
						{{--<tr>--}}
							{{--<td>&nbsp;</td>--}}
							{{--<td>&nbsp;</td>--}}
							{{--<td>&nbsp;</td>--}}
							{{--<td><strong>Loan</strong></td>--}}
							{{--<td class="text-right">--}}{{-- sum of rows --}}{{--</td>--}}
						{{--</tr>--}}
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