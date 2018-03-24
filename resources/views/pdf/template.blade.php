@extends('layouts.pdf')

@section('topCSS')
    <link href="{{url('assets/pdfs/wrapper.css')}}" type="text/css" rel="stylesheet" media="mpdf" />
@endsection

@section('title', 'Paystub')

@section('content')

    <div class="pdf-wrapper">
        <div class="row p-10">
            <div class="col-xs-12">
                <div class="pdf-header">
                    <h3 style="background-color:#f2f2f2;padding:15px 5px 15px 5px;width:100%;">Advice Statement</h3>

                    <div class="row" style="margin-bottom:15px;">
                        <div class="col-xs-12">
                            <address style="background-color:#80808d;color:#fff;width:30%;padding:5px;border:1px solid black;">
                                <strong>Choice Marketing Partners</strong><br>
                                3835 28th St Ste 105<br>
                                Grand Rapids MI 49512
                            </address>
                            <span>
                                <strong>Weekending: </strong> {{date('m-d-Y', strtotime($stubs->first()->wkending))}} <br>
                                <strong>Invoice Date: </strong> {{$invoiceDt}} <br>
                                <br>
                                <strong>Payable To: </strong> {{$emp->name}}
                            </span>
                        </div>
                    </div>
                </div>
                <div class="pdf">
                    <table class="table table-bordered">
                        <thead>
                        <tr>
                            <th class="w-120" style="padding:5px;background-color:#000000;color:#ffffff;">Sale Date</th>
                            <th class="w-200" style="padding:5px;background-color:#000000;color:#ffffff;">Customer Name</th>
                            <th class="w-300" style="padding:5px;background-color:#000000;color:#ffffff;">Address</th>
                            <th class="w-100" style="padding:5px;background-color:#000000;color:#ffffff;">Commissionable</th>
                            <th class="w-120 text-right" style="padding:5px;background-color:#000000;color:#ffffff;">Amount</th>
                        </tr>
                        </thead>
                        <tbody>
                        @foreach($stubs as $s)
                            <tr>
                                <td style="padding:5px;">{{$s->sale_date}}</td>
                                <td class="text-lowercase text-capitalize" style="padding:5px;">{{$s->first_name}} {{$s->last_name}}</td>
                                <td class="text-lowercase text-capitalize" style="padding:5px;">{{$s->address}} {{$s->city}}</td>
                                <td class="text-lowercase text-capitalize" style="padding:5px;">{{$s->status}}</td>
                                <td class="text-right" style="padding:5px;">
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
                                <td colspan="5" style="padding:5px;">
                                    <h4>
                                        <strong>Overrides</strong>
                                    </h4>
                                </td>
                            </tr>
                            <tr class="strong">
                                <td style="padding:5px;">Agent Name</td>
                                <td style="padding:5px;">&nbsp;</td>
                                <td style="padding:5px;">Sales</td>
                                <td style="padding:5px;">Commission</td>
                                <td style="padding:5px;">&nbsp;</td>
                            </tr>
                        @endif
                        @foreach($overrides as $over)
                            <tr>
                                <td style="padding:5px;">{{$over->name}}</td>
                                <td style="padding:5px;">&nbsp;</td>
                                <td style="padding:5px;">{{$over->sales}}</td>
                                <td style="padding:5px;">{{number_format($over->commission, 2)}}</td>
                                <td class="text-right" style="padding:5px;">$ {{number_format($over->total, 2)}}</td>
                            </tr>
                        @endforeach
                        @if(count($expenses) > 0)
                            <tr class="b-b">
                                <td colspan="5" style="padding:5px;">
                                    <h4>
                                        <strong>Expenses</strong>
                                    </h4>
                                </td>
                            </tr>
                            <tr class="strong">
                                <td style="padding:5px;">Type</td>
                                <td colspan="4" style="padding:5px;">Notes</td>
                            </tr>
                        @endif
                        @foreach($expenses as $exp)
                            <tr>
                                <td style="padding:5px;">{{$exp->type}}</td>
                                <td colspan="3" style="padding:5px;">{{$exp->notes}}</td>
                                <td class="text-right" style="padding:5px;">$ {{number_format($exp->amount, 2)}}</td>
                            </tr>
                        @endforeach
                        {{-- paystub footer --}}
                        <tr>
                            <td colspan="5" style="padding:5px;">&nbsp;</td>
                        </tr>
                        <tr>
                            <td colspan="5" style="padding:5px;border-bottom:3px solid #f2f2f2;">&nbsp;</td>
                        </tr>
                        <tr>
                            <td>&nbsp;</td>
                            <td>&nbsp;</td>
                            <td>&nbsp;</td>
                            <td style="padding:5px;"><strong>Gross Pay</strong></td>
                            <td class="text-right" style="padding:5px;"><strong>$ {{number_format($gross, 2)}}</strong></td>
                        </tr>
                        <tr>
                            <td>&nbsp;</td>
                            <td>&nbsp;</td>
                            <td>&nbsp;</td>
                            <td style="padding:5px;"><strong>TOTAL</strong></td>
                            <td class="text-right" style="padding:5px;"><strong>$ {{number_format($gross, 2)}}{{-- sum of rows --}}</strong></td>
                        </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
@endsection
